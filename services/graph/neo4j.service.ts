import neo4j, { Driver, Session, Result, Record } from 'neo4j-driver';

export interface EntityNode {
  id: string;
  type: string;
  name: string;
  properties: Record<any, any>;
}

export interface RelationshipEdge {
  from: string;
  to: string;
  type: string;
  properties: Record<any, any>;
}

interface Entity extends EntityNode {}
interface Relationship extends RelationshipEdge {}

export class Neo4jService {
  private driver: Driver;

  constructor() {
    const neo4jUrl = process.env.NEO4J_URL || 'bolt://localhost:7687';
    const neo4jUser = process.env.NEO4J_USER || 'neo4j';
    const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(
      neo4jUrl,
      neo4j.auth.basic(neo4jUser, neo4jPassword)
    );
  }

  async testConnection(): Promise<boolean> {
    const session: Session = this.driver.session();
    try {
      const result = await session.run('RETURN 1 as test');
      return result.records.length > 0;
    } catch (error) {
      console.error('Neo4j connection test failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Create document node in knowledge graph
   */
  async createDocumentNode(documentId: string, filename: string, metadata: any): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MERGE (d:Document {id: $documentId})
        SET d.filename = $filename,
            d.uploadedAt = datetime(),
            d.metadata = $metadata
        `,
        { 
          documentId, 
          filename, 
          metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata
        }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Create entity nodes and relationships from extracted entities
   */
  async createEntitiesAndRelationships(
    documentId: string,
    entities: Entity[],
    relationships: Relationship[]
  ): Promise<void> {
    const session = this.driver.session();
    const tx = session.beginTransaction();

    try {
      // Create entity nodes
      for (const entity of entities) {
        await tx.run(
          `
          MERGE (e:Entity {id: $id})
          SET e.type = $type,
              e.name = $name,
              e.properties = $properties
          `,
          {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            properties: typeof entity.properties === 'object' ? JSON.stringify(entity.properties) : entity.properties
          }
        );

        // Connect entity to document
        await tx.run(
          `
          MATCH (d:Document {id: $documentId})
          MATCH (e:Entity {id: $entityId})
          MERGE (d)-[:MENTIONS]->(e)
          `,
          { documentId, entityId: entity.id }
        );
      }

      // Create relationships between entities
      for (const rel of relationships) {
        await tx.run(
          `
          MATCH (from:Entity {id: $fromId})
          MATCH (to:Entity {id: $toId})
          MERGE (from)-[r:${rel.type}]->(to)
          SET r.properties = $properties
          `,
          {
            fromId: rel.from,
            toId: rel.to,
            properties: typeof rel.properties === 'object' ? JSON.stringify(rel.properties) : rel.properties
          }
        );
      }

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Find related entities and documents based on query entities
   */
  async findRelatedContext(entityIds: string[], maxDepth: number = 2): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (start:Entity)
        WHERE start.id IN $entityIds
        MATCH path = (start)-[*1..${maxDepth}]-(related)
        RETURN DISTINCT 
          related.id as entityId,
          related.name as entityName,
          related.type as entityType,
          length(path) as distance,
          [n in nodes(path) | n.name] as path_names
        ORDER BY distance, related.name
        LIMIT 50
        `,
        { entityIds }
      );

      return result.records.map((record: Record) => ({
        entityId: record.get('entityId').toString(),
        entityName: record.get('entityName').toString(),
        entityType: record.get('entityType').toString(),
        distance: record.get('distance').toNumber(),
        pathNames: record.get('path_names').toArray()
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Find documents related to specific entities
   */
  async findRelatedDocuments(entityIds: string[]): Promise<string[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity)-[:MENTIONS]-(d:Document)
        WHERE e.id IN $entityIds
        RETURN DISTINCT d.id as documentId
        `,
        { entityIds }
      );

      return result.records.map((record: Record) => record.get('documentId').toString());
    } finally {
      await session.close();
    }
  }

  async getRelatedDocuments(documentId: string, maxDepth: number = 2): Promise<string[]> {
    const session: Session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        MATCH (d)-[:MENTIONS]->(e:Entity)
        MATCH (e)<-[:MENTIONS]-(related:Document)
        WHERE related.id <> $documentId
        RETURN DISTINCT related.id as documentId
        LIMIT 10
        `,
        { documentId }
      );

      return result.records.map((record: Record) => record.get('documentId').toString());
    } catch (error) {
      console.error('Error getting related documents:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  async searchEntitiesByText(searchText: string, limit: number = 10): Promise<string[]> {
    const session: Session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Document)-[:MENTIONS]->(e:Entity)
        WHERE e.properties CONTAINS $searchText 
           OR e.type CONTAINS $searchText
        RETURN DISTINCT d.id as documentId
        LIMIT $limit
        `,
        { searchText, limit }
      );

      return result.records.map((record: Record) => record.get('documentId').toString());
    } catch (error) {
      console.error('Error searching entities by text:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
