import { transcriptYoutubeVideo } from '../utils/youtube/transcriptYoutubeVideo.js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { EntityExtractorService } from './graph/entityExtractor.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface YouTubeRAGData {
  // PostgreSQL data structure for pgvector
  pgvectorData: {
    documentId: string;
    chunks: Array<{
      id: string;
      content: string;
      embeddings: number[];
      metadata: {
        videoId: string;
        videoTitle: string;
        videoAuthor: string;
        videoUrl: string;
        chunkIndex: number;
        documentType: 'youtube_transcript';
      };
      chunkIndex: number;
    }>;
    documentMetadata: {
      videoId: string;
      title: string;
      author: string;
      url: string;
      transcriptLength: number;
      processedAt: string;
    };
  };
  
  // Neo4j data structure for knowledge graph
  neo4jData: {
    videoNode: {
      id: string;
      videoId: string;
      title: string;
      author: string;
      url: string;
      type: 'YouTube';
      transcriptLength: number;
      processedAt: string;
    };
    entities: Array<{
      name: string;
      type: string;
      description?: string;
      confidence: number;
      chunkId: string;
    }>;
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      confidence: number;
      context: string;
    }>;
  };
}

export class YouTubeRAGService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private entityExtractor: EntityExtractorService;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    this.entityExtractor = new EntityExtractorService();
  }

  /**
   * Clean and normalize transcript text
   */
  private cleanTranscriptText(text: string): string {
    if (!text) return '';
    
    return text
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove replacement characters
      .replace(/\uFFFD/g, '')
      // Normalize whitespace but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Generate embeddings for text chunks in batches
   */
  private async generateEmbeddingsBatch(texts: string[], batchSize: number = 5): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
      
      try {
        const batchEmbeddings = await this.embeddings.embedDocuments(batch);
        embeddings.push(...batchEmbeddings);
        
        // Rate limiting - wait 1 second between batches
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch ${i}-${i + batchSize}:`, error);
        throw new Error(`Failed to generate embeddings: ${(error as Error).message}`);
      }
    }
    
    return embeddings;
  }

  /**
   * Find which chunk an entity belongs to
   */
  private findEntityChunk(entityName: string, chunks: any[]): string {
    for (const chunk of chunks) {
      if (chunk.content.toLowerCase().includes(entityName.toLowerCase())) {
        return chunk.id;
      }
    }
    // If not found in any chunk, return first chunk ID as fallback
    return chunks[0]?.id || '';
  }

  /**
   * Process YouTube video transcript using existing logic and prepare RAG data
   */
  async processYouTubeVideoForRAG(youtubeUrl: string, language?: string): Promise<YouTubeRAGData> {
    try {
      console.log(`Processing YouTube video for RAG: ${youtubeUrl}`);
      
      // Use existing YouTube transcript logic
      const youtubeData = await transcriptYoutubeVideo(youtubeUrl, language);
      
      console.log(`Video title: ${youtubeData.title}`);
      console.log(`Video author: ${youtubeData.author}`);
      
      // Clean the transcript
      const cleanedTranscript = this.cleanTranscriptText(youtubeData.transcript);
      
      if (!cleanedTranscript || cleanedTranscript.length < 50) {
        throw new Error('Transcript too short or empty after cleaning');
      }
      
      console.log(`Transcript length: ${cleanedTranscript.length} characters`);
      
      // Split transcript into chunks
      const documents = await this.textSplitter.splitText(cleanedTranscript);
      console.log(`Created ${documents.length} chunks`);
      
      // Generate embeddings for all chunks
      const embeddings = await this.generateEmbeddingsBatch(documents);
      
      // Create document ID
      const documentId = uuidv4();
      
      // Create chunks with metadata
      const chunks = documents.map((content, index) => ({
        id: uuidv4(),
        content: this.cleanTranscriptText(content),
        embeddings: embeddings[index],
        metadata: {
          videoId: youtubeData.id,
          videoTitle: youtubeData.title,
          videoAuthor: youtubeData.author,
          videoUrl: youtubeData.url,
          chunkIndex: index,
          documentType: 'youtube_transcript' as const,
        },
        chunkIndex: index,
      }));
      
      // Extract entities and relationships for Neo4j
      console.log('Extracting entities and relationships...');
      const { entities, relationships } = await this.entityExtractor.extractEntities(
        cleanedTranscript, 
        documentId
      );
      
      // Map entities to chunks with proper type conversion
      const entitiesWithChunks = entities.map(entity => ({
        name: entity.name,
        type: entity.type,
        description: (entity.properties as any)?.description || undefined,
        confidence: (entity.properties as any)?.confidence || 0.8,
        chunkId: this.findEntityChunk(entity.name, chunks),
      }));
      
      // Map relationships with proper type conversion
      const mappedRelationships = relationships.map(rel => ({
        source: rel.from || 'unknown',
        target: rel.to || 'unknown',
        type: rel.type || 'RELATES_TO',
        confidence: (rel.properties as any)?.confidence || 0.7,
        context: (rel.properties as any)?.context || (rel.properties as any)?.description || 'No context provided',
      }));
      
      // Prepare structured data for both systems
      const ragData: YouTubeRAGData = {
        pgvectorData: {
          documentId,
          chunks,
          documentMetadata: {
            videoId: youtubeData.id,
            title: youtubeData.title,
            author: youtubeData.author,
            url: youtubeData.url,
            transcriptLength: cleanedTranscript.length,
            processedAt: new Date().toISOString(),
          },
        },
        neo4jData: {
          videoNode: {
            id: documentId,
            videoId: youtubeData.id,
            title: youtubeData.title,
            author: youtubeData.author,
            url: youtubeData.url,
            type: 'YouTube',
            transcriptLength: cleanedTranscript.length,
            processedAt: new Date().toISOString(),
          },
          entities: entitiesWithChunks,
          relationships: mappedRelationships,
        },
      };
      
      console.log(`Successfully processed YouTube video: ${youtubeData.title}`);
      console.log(`- Chunks: ${chunks.length}`);
      console.log(`- Entities: ${entities.length}`);
      console.log(`- Relationships: ${relationships.length}`);
      
      return ragData;
      
    } catch (error) {
      console.error('Error processing YouTube video for RAG:', error);
      throw new Error(`Failed to process YouTube video for RAG: ${(error as Error).message}`);
    }
  }

  /**
   * Get YouTube video transcript using existing logic (without RAG processing)
   */
  async getYouTubeTranscript(youtubeUrl: string, language?: string): Promise<{
    transcript: string;
    title: string;
    author: string;
    id: string;
    url: string;
  }> {
    return await transcriptYoutubeVideo(youtubeUrl, language);
  }
}
