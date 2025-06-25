import { PDFEmbeddingService } from './embedding/pdfEmbedding.service.js';
import { Neo4jService } from './graph/neo4j.service.js';
import { EntityExtractorService } from './graph/entityExtractor.service.js';

export interface HybridSearchResult {
  chunkContent: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  similarity: number;
  source: 'vector' | 'graph' | 'hybrid';
  graphContext?: {
    relatedEntities: string[];
    relationshipPaths: string[][];
  };
}

export interface SearchStrategy {
  vectorWeight: number;      // 0-1, how much to weight vector similarity
  graphWeight: number;       // 0-1, how much to weight graph relationships
  enableGraphExpansion: boolean; // whether to include graph-related documents
  maxGraphDepth: number;     // how deep to traverse relationships
}

export class HybridRAGService {
  private vectorService: PDFEmbeddingService;
  private graphService: Neo4jService;
  private entityExtractor: EntityExtractorService;

  constructor() {
    this.vectorService = new PDFEmbeddingService();
    this.graphService = new Neo4jService();
    this.entityExtractor = new EntityExtractorService();
  }

  /**
   * Enhanced PDF upload with both vector embeddings and knowledge graph
   */
  async embedPDFWithGraph(filePath: string, filename: string): Promise<string> {
    try {
      console.log(`Starting hybrid embedding for: ${filename}`);
      
      // 1. Standard vector embedding
      const documentId = await this.vectorService.embedPDF(filePath, filename);
      
      // 2. Extract text for entity processing
      const fullText = await this.extractFullText(filePath);
      
      // 3. Extract entities and relationships
      const { entities, relationships } = await this.entityExtractor.extractEntities(fullText, documentId);
      
      // 4. Create knowledge graph
      await this.graphService.createDocumentNode(documentId, filename, {
        uploadedAt: new Date().toISOString(),
        entityCount: entities.length,
        relationshipCount: relationships.length
      });
      
      await this.graphService.createEntitiesAndRelationships(documentId, entities, relationships);
      
      console.log(`Hybrid embedding complete: ${entities.length} entities, ${relationships.length} relationships`);
      return documentId;
      
    } catch (error) {
      console.error('Error in hybrid PDF embedding:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity and graph relationships
   */
  async hybridSearch(
    query: string, 
    limit: number = 10,
    strategy: SearchStrategy = {
      vectorWeight: 0.7,
      graphWeight: 0.3,
      enableGraphExpansion: true,
      maxGraphDepth: 2
    }
  ): Promise<HybridSearchResult[]> {
    try {
      console.log(`Hybrid search for: "${query}"`);
      
      // 1. Vector similarity search
      const vectorResults = await this.vectorService.searchSimilarChunks(query, Math.ceil(limit * 1.5));
      
      // 2. Extract entities from query
      const queryEntities = await this.entityExtractor.extractQueryEntities(query);
      
      // 3. Graph-enhanced results
      let enhancedResults: HybridSearchResult[] = [];
      
      if (strategy.enableGraphExpansion && queryEntities.length > 0) {
        // Find related context through graph
        const relatedContext = await this.graphService.findRelatedContext(queryEntities, strategy.maxGraphDepth);
        const relatedDocuments = await this.graphService.findRelatedDocuments(queryEntities);
        
        // Enhance vector results with graph context
        enhancedResults = await this.enhanceResultsWithGraph(vectorResults, relatedContext, relatedDocuments);
      } else {
        // Convert vector results to hybrid format
        enhancedResults = vectorResults.map(result => ({
          chunkContent: result.chunk_content,
          documentId: result.document_id,
          filename: result.filename,
          chunkIndex: result.chunk_index,
          similarity: result.similarity,
          source: 'vector' as const
        }));
      }
      
      // 4. Score and rank results
      const scoredResults = this.scoreAndRankResults(enhancedResults, strategy);
      
      return scoredResults.slice(0, limit);
      
    } catch (error) {
      console.error('Error in hybrid search:', error);
      // Fallback to vector-only search
      const vectorResults = await this.vectorService.searchSimilarChunks(query, limit);
      return vectorResults.map(result => ({
        chunkContent: result.chunk_content,
        documentId: result.document_id,
        filename: result.filename,
        chunkIndex: result.chunk_index,
        similarity: result.similarity,
        source: 'vector' as const
      }));
    }
  }

  /**
   * Enhance vector search results with graph context
   */
  private async enhanceResultsWithGraph(
    vectorResults: any[],
    relatedContext: any[],
    relatedDocuments: string[]
  ): Promise<HybridSearchResult[]> {
    const enhanced: HybridSearchResult[] = [];
    
    for (const result of vectorResults) {
      const graphContext = {
        relatedEntities: relatedContext
          .filter(ctx => ctx.distance <= 2)
          .map(ctx => ctx.entityName),
        relationshipPaths: relatedContext
          .filter(ctx => ctx.pathNames)
          .map(ctx => ctx.pathNames)
      };
      
      const isGraphRelated = relatedDocuments.includes(result.document_id);
      
      enhanced.push({
        chunkContent: result.chunk_content,
        documentId: result.document_id,
        filename: result.filename,
        chunkIndex: result.chunk_index,
        similarity: result.similarity,
        source: isGraphRelated ? 'hybrid' : 'vector',
        graphContext: graphContext.relatedEntities.length > 0 ? graphContext : undefined
      });
    }
    
    return enhanced;
  }

  /**
   * Score and rank hybrid results
   */
  private scoreAndRankResults(
    results: HybridSearchResult[],
    strategy: SearchStrategy
  ): HybridSearchResult[] {
    return results
      .map(result => {
        let score = result.similarity * strategy.vectorWeight;
        
        // Boost graph-related results
        if (result.source === 'hybrid' || result.source === 'graph') {
          score += strategy.graphWeight;
        }
        
        // Boost results with rich graph context
        if (result.graphContext?.relatedEntities && result.graphContext.relatedEntities.length > 0) {
          score += 0.1 * Math.min(result.graphContext.relatedEntities.length, 5);
        }
        
        return { ...result, similarity: score };
      })
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Extract full text from PDF (helper method)
   */
  private async extractFullText(filePath: string): Promise<string> {
    // This would use the same PDF extraction logic from PDFEmbeddingService
    // For now, return empty string - implement based on your PDF extraction
    return '';
  }

  /**
   * Get relationship insights for a document
   */
  async getDocumentInsights(documentId: string): Promise<{
    entities: any[];
    relatedDocuments: string[];
    conceptClusters: any[];
  }> {
    // Implementation for document analysis
    return {
      entities: [],
      relatedDocuments: [],
      conceptClusters: []
    };
  }

  async close(): Promise<void> {
    await this.graphService.close();
  }
}
