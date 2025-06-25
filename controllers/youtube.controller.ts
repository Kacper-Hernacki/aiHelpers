import { Request, Response } from "express";
import { transcriptYoutubeVideo } from "../utils/youtube/transcriptYoutubeVideo.js";
import { YouTubeRAGService } from '../services/youtubeRAG.service.js';

const youtubeRAGService = new YouTubeRAGService();

export const youtubeController = {
  transcriptYoutubeVideo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { url, language } = req.body;
      console.log("url", url);
      const response = await transcriptYoutubeVideo(url, language);

      res.status(201).json({ status: "success", response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false, 
        error: `Error getting transcript: ${(error as Error).message}` 
      });
    }
  },

  /**
   * Process YouTube video for hybrid RAG system
   * POST /youtube/process-for-rag
   * Body: { url: string, language?: string }
   */
  processForRAG: async (req: Request, res: Response): Promise<void> => {
    try {
      const { url, language } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'YouTube URL is required'
        });
        return;
      }

      console.log(`Processing YouTube video for RAG: ${url}`);

      // Process the video and get structured RAG data
      const ragData = await youtubeRAGService.processYouTubeVideoForRAG(url, language);

      // Return the structured data (no database upload)
      res.status(200).json({
        success: true,
        message: 'YouTube video processed for RAG successfully',
        data: {
          documentId: ragData.pgvectorData.documentId,
          videoMetadata: ragData.pgvectorData.documentMetadata,
          chunksCount: ragData.pgvectorData.chunks.length,
          entitiesCount: ragData.neo4jData.entities.length,
          relationshipsCount: ragData.neo4jData.relationships.length,
          
          // Structured data for implementation
          pgvectorData: ragData.pgvectorData,
          neo4jData: ragData.neo4jData
        }
      });

    } catch (error) {
      console.error('Error processing YouTube video for RAG:', error);
      res.status(500).json({ 
        success: false, 
        error: `Error processing YouTube video for RAG: ${(error as Error).message}` 
      });
    }
  },

  /**
   * Process YouTube video with implementation examples
   * POST /youtube/process-with-examples
   * Body: { url: string, language?: string }
   */
  processWithExamples: async (req: Request, res: Response): Promise<void> => {
    try {
      const { url, language } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'YouTube URL is required'
        });
        return;
      }

      const ragData = await youtubeRAGService.processYouTubeVideoForRAG(url, language);

      // Provide implementation examples
      const implementationExamples = {
        pgvectorInsertExample: {
          description: "Example SQL for inserting into PostgreSQL with pgvector",
          sql: `
            INSERT INTO document_embeddings (
              id, document_id, chunk_content, chunk_index, 
              embedding, metadata, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW()
            )
          `,
          exampleData: ragData.pgvectorData.chunks[0] ? {
            id: ragData.pgvectorData.chunks[0].id,
            document_id: ragData.pgvectorData.documentId,
            chunk_content: ragData.pgvectorData.chunks[0].content.substring(0, 100) + "...",
            chunk_index: ragData.pgvectorData.chunks[0].chunkIndex,
            embedding: `[${ragData.pgvectorData.chunks[0].embeddings.slice(0, 5).join(', ')}, ...]`,
            metadata: ragData.pgvectorData.chunks[0].metadata
          } : null
        },

        neo4jCypherExamples: {
          description: "Example Cypher queries for Neo4j knowledge graph",
          createVideoNode: `
            MERGE (v:Video {id: $videoId})
            SET v.title = $title,
                v.author = $author,
                v.url = $url,
                v.type = $type,
                v.transcriptLength = $transcriptLength,
                v.processedAt = $processedAt
          `,
          createEntityNode: `
            MERGE (e:Entity {name: $entityName})
            SET e.type = $entityType,
                e.description = $entityDescription,
                e.confidence = $confidence
          `,
          createRelationship: `
            MATCH (source:Entity {name: $sourceName}),
                  (target:Entity {name: $targetName})
            MERGE (source)-[r:RELATES_TO {type: $relationType}]->(target)
            SET r.confidence = $confidence,
                r.context = $context
          `,
          connectVideoToEntities: `
            MATCH (v:Video {id: $videoId}),
                  (e:Entity {name: $entityName})
            MERGE (v)-[:CONTAINS]->(e)
          `,
          exampleData: {
            videoNode: ragData.neo4jData.videoNode,
            sampleEntity: ragData.neo4jData.entities[0] || null,
            sampleRelationship: ragData.neo4jData.relationships[0] || null
          }
        },

        hybridSearchExample: {
          description: "Example hybrid search combining vector similarity and graph traversal",
          vectorSearch: `
            SELECT id, chunk_content, metadata, 
                   (embedding <=> $queryEmbedding) as similarity
            FROM document_embeddings 
            WHERE metadata->>'documentType' = 'youtube_transcript'
            ORDER BY similarity
            LIMIT 10
          `,
          graphTraversal: `
            MATCH (v:Video {type: 'YouTube'})-[:CONTAINS]->(e:Entity)
            MATCH (e)-[r:RELATES_TO*1..2]-(related:Entity)
            RETURN v, e, related, r
          `,
          hybridQuery: `
            // First get vector similarities
            SELECT document_id FROM document_embeddings 
            WHERE (embedding <=> $queryEmbedding) < 0.8
            
            // Then expand with graph relationships
            MATCH (v:Video)-[:CONTAINS]->(e:Entity)-[:RELATES_TO*1..2]-(related)
            WHERE v.id IN $vectorResults
            RETURN DISTINCT v, related
          `
        }
      };

      res.status(200).json({
        success: true,
        message: 'YouTube video processed with implementation examples',
        data: {
          summary: {
            documentId: ragData.pgvectorData.documentId,
            videoTitle: ragData.pgvectorData.documentMetadata.title,
            videoAuthor: ragData.pgvectorData.documentMetadata.author,
            chunksCount: ragData.pgvectorData.chunks.length,
            entitiesCount: ragData.neo4jData.entities.length,
            relationshipsCount: ragData.neo4jData.relationships.length
          },
          
          // Full structured data
          ragData,
          
          // Implementation examples
          implementationExamples
        }
      });

    } catch (error) {
      console.error('Error processing YouTube video with examples:', error);
      res.status(500).json({ 
        success: false, 
        error: `Error processing YouTube video with examples: ${(error as Error).message}` 
      });
    }
  }
};
