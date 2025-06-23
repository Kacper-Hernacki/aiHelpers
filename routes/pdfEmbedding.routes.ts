import express from 'express';
import { PDFEmbeddingController, upload } from '../controllers/pdfEmbedding.controller.js';

const router = express.Router();

/**
 * @route POST /api/pdf/embed
 * @description Upload and embed a PDF file into vector database
 * @body multipart/form-data with 'pdf' field containing the PDF file
 */
router.post('/embed', upload.single('pdf'), PDFEmbeddingController.embedPDF);

/**
 * @route POST /api/pdf/search
 * @description Search for similar document chunks based on query
 * @body { query: string, limit?: number }
 */
router.post('/search', PDFEmbeddingController.searchChunks);

/**
 * @route GET /api/pdf/documents
 * @description Get all embedded documents
 */
router.get('/documents', PDFEmbeddingController.getAllDocuments);

/**
 * @route GET /api/pdf/documents/:documentId/chunks
 * @description Get all chunks for a specific document
 */
router.get('/documents/:documentId/chunks', PDFEmbeddingController.getDocumentChunks);

/**
 * @route DELETE /api/pdf/documents/:documentId
 * @description Delete a document and all its chunks
 */
router.delete('/documents/:documentId', PDFEmbeddingController.deleteDocument);

export default router;
