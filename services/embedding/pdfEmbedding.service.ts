import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { PDFTextExtractor } from '../../utils/pdfTextExtractor.js';

const prisma = new PrismaClient();

export class PDFEmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small", // Using smaller model for cost efficiency
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', ''],
    });
  }

  /**
   * Clean text to remove null bytes and invalid UTF8 characters
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      // Remove null bytes and other control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove any remaining invalid UTF8 sequences
      .replace(/\uFFFD/g, '') // Remove replacement characters
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate text for database storage
   */
  private validateText(text: string, maxLength: number = 100000): string {
    if (!text) return '';
    
    const cleaned = this.cleanText(text);
    
    // Truncate if too long to prevent database issues
    if (cleaned.length > maxLength) {
      console.warn(`Text truncated from ${cleaned.length} to ${maxLength} characters`);
      return cleaned.substring(0, maxLength) + '...';
    }
    
    return cleaned;
  }

  async embedPDF(filePath: string, filename: string): Promise<string> {
    try {
      const documentId = uuidv4();
      let fullText = '';

      // Try multiple methods for PDF text extraction
      try {
        // Method 1: Try LangChain PDFLoader
        const loader = new PDFLoader(filePath, {
          splitPages: false,
        });
        const docs = await loader.load();
        fullText = docs.map(doc => doc.pageContent).join('\n\n');
        
        console.log('Successfully extracted text using LangChain PDFLoader');
      } catch (langchainError: any) {
        console.log('LangChain PDFLoader failed, trying fallback method:', langchainError.message);
        
        // Method 2: Use our fallback extractor
        fullText = await PDFTextExtractor.extractText(filePath);
        console.log('Successfully extracted text using fallback method');
      }

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      fullText = this.validateText(fullText);

      // Split text into chunks
      const chunks = await this.textSplitter.splitText(fullText);

      console.log(`Processing ${chunks.length} chunks for document: ${filename}`);

      // Process chunks in batches to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        await this.processBatch(batch, documentId, filename, fullText, i);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Clean up temporary file if it exists
      if (filePath.includes('/tmp/') || filePath.includes('/uploads/')) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn('Could not delete temp file:', err);
        }
      }

      return documentId;
    } catch (error) {
      console.error('Error embedding PDF:', error);
      throw error;
    }
  }

  private async processBatch(
    chunks: string[], 
    documentId: string, 
    filename: string, 
    fullText: string, 
    startIndex: number
  ): Promise<void> {
    try {
      // Generate embeddings for the batch
      const embeddings = await this.embeddings.embedDocuments(chunks);

      // Prepare database records
      const records = chunks.map((chunk, index) => ({
        document_id: documentId,
        filename,
        content: fullText,
        chunk_index: startIndex + index,
        chunk_content: this.validateText(chunk),
        embedding: `[${embeddings[index].join(',')}]`, // Convert to PostgreSQL array format
        metadata: {
          chunk_size: chunk.length,
          embedding_model: "text-embedding-3-small",
          processed_at: new Date().toISOString(),
        },
      }));

      // Insert into database using raw SQL for vector type
      for (const record of records) {
        await prisma.$executeRaw`
          INSERT INTO document_embeddings (
            document_id, filename, content, chunk_index, chunk_content, embedding, metadata, created_at, updated_at
          ) VALUES (
            ${record.document_id},
            ${record.filename},
            ${record.content},
            ${record.chunk_index},
            ${record.chunk_content},
            ${record.embedding}::vector,
            ${JSON.stringify(record.metadata)}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }

      console.log(`Processed batch of ${chunks.length} chunks`);
    } catch (error) {
      console.error('Error processing batch:', error);
      throw error;
    }
  }

  async searchSimilarChunks(query: string, limit: number = 5): Promise<any[]> {
    try {
      // Clean the query text
      const cleanQuery = this.cleanText(query);
      
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(cleanQuery);
      const queryVector = `[${queryEmbedding.join(',')}]`;

      // Search for similar chunks using cosine similarity
      const results = await prisma.$queryRaw`
        SELECT 
          document_id,
          filename,
          chunk_content,
          chunk_index,
          metadata,
          1 - (embedding <=> ${queryVector}::vector) as similarity
        FROM document_embeddings
        ORDER BY embedding <=> ${queryVector}::vector
        LIMIT ${limit}
      `;

      return results as any[];
    } catch (error) {
      console.error('Error searching similar chunks:', error);
      throw error;
    }
  }

  async getDocumentChunks(documentId: string): Promise<any[]> {
    try {
      const chunks = await prisma.document_embeddings.findMany({
        where: { document_id: documentId },
        orderBy: { chunk_index: 'asc' },
        select: {
          chunk_content: true,
          chunk_index: true,
          metadata: true,
        },
      });

      return chunks;
    } catch (error) {
      console.error('Error fetching document chunks:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await prisma.document_embeddings.deleteMany({
        where: { document_id: documentId },
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getAllDocuments(): Promise<any[]> {
    try {
      const documents = await prisma.$queryRaw`
        SELECT 
          document_id,
          filename,
          COUNT(*) as chunk_count,
          MIN(created_at) as created_at,
          MAX(updated_at) as updated_at
        FROM document_embeddings
        GROUP BY document_id, filename
        ORDER BY created_at DESC
      `;

      return documents as any[];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }
}
