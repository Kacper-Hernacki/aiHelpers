import { Request, Response } from 'express';
import { PDFEmbeddingService } from '../services/embedding/pdfEmbedding.service.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const pdfEmbeddingService = new PDFEmbeddingService();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/pdfs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

export class PDFEmbeddingController {
  /**
   * Upload and embed a PDF file
   */
  static async embedPDF(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No PDF file uploaded'
        });
        return;
      }

      const { path: filePath, originalname } = req.file;

      console.log(`Starting PDF embedding for: ${originalname}`);

      const documentId = await pdfEmbeddingService.embedPDF(filePath, originalname);

      res.json({
        success: true,
        data: {
          documentId,
          filename: originalname,
          message: 'PDF successfully embedded into vector database'
        }
      });

    } catch (error) {
      console.error('Error in embedPDF:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to embed PDF'
      });
    }
  }

  /**
   * Search for similar chunks based on query
   */
  static async searchChunks(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit = 5 } = req.body;

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query is required'
        });
        return;
      }

      const results = await pdfEmbeddingService.searchSimilarChunks(query, parseInt(limit));

      res.json({
        success: true,
        data: {
          query,
          results: results.map(result => ({
            documentId: result.document_id,
            filename: result.filename,
            content: result.chunk_content,
            chunkIndex: result.chunk_index,
            similarity: parseFloat(result.similarity),
            metadata: result.metadata
          }))
        }
      });

    } catch (error) {
      console.error('Error in searchChunks:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search chunks'
      });
    }
  }

  /**
   * Get all chunks for a specific document
   */
  static async getDocumentChunks(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required'
        });
        return;
      }

      const chunks = await pdfEmbeddingService.getDocumentChunks(documentId);

      res.json({
        success: true,
        data: {
          documentId,
          chunks
        }
      });

    } catch (error) {
      console.error('Error in getDocumentChunks:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document chunks'
      });
    }
  }

  /**
   * Delete a document and all its chunks
   */
  static async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required'
        });
        return;
      }

      await pdfEmbeddingService.deleteDocument(documentId);

      res.json({
        success: true,
        data: {
          documentId,
          message: 'Document successfully deleted'
        }
      });

    } catch (error) {
      console.error('Error in deleteDocument:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document'
      });
    }
  }

  /**
   * Get all embedded documents
   */
  static async getAllDocuments(req: Request, res: Response): Promise<void> {
    try {
      const documents = await pdfEmbeddingService.getAllDocuments();

      res.json({
        success: true,
        data: {
          documents: documents.map(doc => ({
            documentId: doc.document_id,
            filename: doc.filename,
            chunkCount: parseInt(doc.chunk_count),
            createdAt: doc.created_at,
            updatedAt: doc.updated_at
          }))
        }
      });

    } catch (error) {
      console.error('Error in getAllDocuments:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get documents'
      });
    }
  }
}
