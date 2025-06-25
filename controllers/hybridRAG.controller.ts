import { Request, Response } from 'express';
import { HybridRAGService, SearchStrategy } from '../services/hybridRAG.service';
import { Neo4jService } from '../services/graph/neo4j.service';

const hybridService = new HybridRAGService();
const graphService = new Neo4jService();

/**
 * Upload PDF with hybrid processing (vector + graph)
 */
export const uploadPDFHybrid = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { filename, path } = req.file;
    console.log(`Processing hybrid upload: ${filename}`);

    // Test Neo4j connection first
    const isConnected = await graphService.testConnection();
    if (!isConnected) {
      console.warn('Neo4j not available, falling back to vector-only processing');
      // Fallback to regular vector processing here
      res.status(500).json({ 
        error: 'Graph database unavailable',
        suggestion: 'Start Neo4j with: ./setup-neo4j.sh'
      });
      return;
    }

    const documentId = await hybridService.embedPDFWithGraph(path, filename);

    res.json({
      message: 'PDF processed with hybrid RAG',
      documentId,
      features: [
        'Vector embeddings created',
        'Entities extracted',
        'Knowledge graph updated',
        'Cross-document relationships mapped'
      ]
    });

  } catch (error) {
    console.error('Hybrid upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process PDF with hybrid system',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Hybrid search with configurable strategy
 */
export const hybridSearch = async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      limit = 5,
      vectorWeight = 0.7,
      graphWeight = 0.3,
      enableGraphExpansion = true,
      maxGraphDepth = 2
    } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const strategy: SearchStrategy = {
      vectorWeight,
      graphWeight,
      enableGraphExpansion,
      maxGraphDepth
    };

    const results = await hybridService.hybridSearch(query, limit, strategy);

    res.json({
      query,
      strategy,
      resultCount: results.length,
      results: results.map(result => ({
        content: result.chunkContent.substring(0, 500) + '...',
        document: result.filename,
        similarity: result.similarity,
        source: result.source,
        graphContext: result.graphContext ? {
          relatedEntities: result.graphContext.relatedEntities.slice(0, 5),
          hasRelationships: result.graphContext.relationshipPaths.length > 0
        } : undefined
      }))
    });

  } catch (error) {
    console.error('Hybrid search error:', error);
    res.status(500).json({ 
      error: 'Hybrid search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Compare vector-only vs hybrid search results
 */
export const compareSearchMethods = async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    // Vector-only search
    const vectorStrategy: SearchStrategy = {
      vectorWeight: 1.0,
      graphWeight: 0.0,
      enableGraphExpansion: false,
      maxGraphDepth: 0
    };

    // Hybrid search
    const hybridStrategy: SearchStrategy = {
      vectorWeight: 0.7,
      graphWeight: 0.3,
      enableGraphExpansion: true,
      maxGraphDepth: 2
    };

    const [vectorResults, hybridResults] = await Promise.all([
      hybridService.hybridSearch(query, limit, vectorStrategy),
      hybridService.hybridSearch(query, limit, hybridStrategy)
    ]);

    res.json({
      query,
      comparison: {
        vectorOnly: {
          count: vectorResults.length,
          avgSimilarity: vectorResults.reduce((sum, r) => sum + r.similarity, 0) / vectorResults.length,
          results: vectorResults.slice(0, 3).map(r => ({
            content: r.chunkContent.substring(0, 200) + '...',
            similarity: r.similarity,
            source: r.source
          }))
        },
        hybrid: {
          count: hybridResults.length,
          avgSimilarity: hybridResults.reduce((sum, r) => sum + r.similarity, 0) / hybridResults.length,
          contextEnriched: hybridResults.filter(r => r.graphContext).length,
          results: hybridResults.slice(0, 3).map(r => ({
            content: r.chunkContent.substring(0, 200) + '...',
            similarity: r.similarity,
            source: r.source,
            hasGraphContext: !!r.graphContext
          }))
        }
      }
    });

  } catch (error) {
    console.error('Search comparison error:', error);
    res.status(500).json({ 
      error: 'Search comparison failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get system status and capabilities
 */
export const getSystemStatus = async (req: Request, res: Response) => {
  try {
    const neo4jConnected = await graphService.testConnection();
    
    res.json({
      status: 'operational',
      capabilities: {
        vectorSearch: true,
        graphDatabase: neo4jConnected,
        entityExtraction: true,
        hybridRAG: neo4jConnected
      },
      recommendations: neo4jConnected ? [
        'System fully operational with hybrid capabilities'
      ] : [
        'Start Neo4j for full hybrid functionality: ./setup-neo4j.sh',
        'Currently running in vector-only mode'
      ]
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
