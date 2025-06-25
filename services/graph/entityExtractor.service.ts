import { OpenAI } from 'openai';
import { EntityNode, RelationshipEdge } from './neo4j.service.js';

export interface ExtractedEntity {
  text: string;
  type: string;
  confidence: number;
  startPos: number;
  endPos: number;
}

export class EntityExtractorService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Extract entities from text using OpenAI API
   */
  async extractEntities(text: string, documentId: string): Promise<{
    entities: EntityNode[];
    relationships: RelationshipEdge[];
  }> {
    try {
      // Split text into chunks for processing
      const chunks = this.splitTextForProcessing(text);
      const allEntities: EntityNode[] = [];
      const allRelationships: RelationshipEdge[] = [];

      for (const chunk of chunks) {
        const result = await this.extractFromChunk(chunk, documentId);
        allEntities.push(...result.entities);
        allRelationships.push(...result.relationships);
      }

      // Deduplicate entities
      const uniqueEntities = this.deduplicateEntities(allEntities);
      
      return {
        entities: uniqueEntities,
        relationships: allRelationships
      };
    } catch (error) {
      console.error('Error extracting entities:', error);
      return { entities: [], relationships: [] };
    }
  }

  /**
   * Extract entities from a single chunk using OpenAI
   */
  private async extractFromChunk(chunk: string, documentId: string): Promise<{
    entities: EntityNode[];
    relationships: RelationshipEdge[];
  }> {
    const prompt = `
    Extract entities and relationships from the following text. 
    Return a JSON object with "entities" and "relationships" arrays.

    For entities, include:
    - name: the entity name
    - type: PERSON, ORGANIZATION, LOCATION, CONCEPT, or TECHNOLOGY
    - description: brief description

    For relationships, include:
    - from: source entity name
    - to: target entity name  
    - type: RELATES_TO, PART_OF, MENTIONS, or SIMILAR_TO
    - description: relationship description

    Text: "${chunk.substring(0, 2000)}"

    Return only valid JSON:
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return { entities: [], relationships: [] };

      const parsed = JSON.parse(content);
      
      // Convert to our format
      const entities: EntityNode[] = (parsed.entities || []).map((entity: any, index: number) => ({
        id: `${documentId}_entity_${this.generateEntityId(entity.name)}`,
        type: entity.type || 'CONCEPT',
        name: entity.name,
        properties: {
          description: entity.description,
          documentId,
          extractedAt: new Date().toISOString()
        }
      }));

      const relationships: RelationshipEdge[] = (parsed.relationships || []).map((rel: any) => {
        const fromEntity = entities.find(e => e.name.toLowerCase() === rel.from.toLowerCase());
        const toEntity = entities.find(e => e.name.toLowerCase() === rel.to.toLowerCase());
        
        if (!fromEntity || !toEntity) return null;
        
        return {
          from: fromEntity.id,
          to: toEntity.id,
          type: rel.type || 'RELATES_TO',
          properties: {
            description: rel.description,
            confidence: 0.8,
            extractedAt: new Date().toISOString()
          }
        };
      }).filter(Boolean);

      return { entities, relationships };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      return { entities: [], relationships: [] };
    }
  }

  /**
   * Split text into processable chunks
   */
  private splitTextForProcessing(text: string): string[] {
    const maxChunkSize = 2000;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.substring(i, i + maxChunkSize));
    }
    
    return chunks;
  }

  /**
   * Deduplicate entities based on name similarity
   */
  private deduplicateEntities(entities: EntityNode[]): EntityNode[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = entity.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate consistent entity ID from name
   */
  private generateEntityId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Extract entities from query text for search enhancement
   */
  async extractQueryEntities(query: string): Promise<string[]> {
    try {
      const prompt = `
      Extract the main entities (names, organizations, concepts, technologies) from this search query.
      Return only a JSON array of entity names.
      
      Query: "${query}"
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      const entities = JSON.parse(content);
      return Array.isArray(entities) ? entities : [];
    } catch (error) {
      console.error('Error extracting query entities:', error);
      return [];
    }
  }
}
