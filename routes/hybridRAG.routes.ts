import { Router } from 'express';
import multer from 'multer';
import {
  uploadPDFHybrid,
  hybridSearch,
  compareSearchMethods,
  getSystemStatus
} from '../controllers/hybridRAG.controller.js';

const router = Router();

// Multer configuration for PDF uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Hybrid RAG routes
router.post('/upload-hybrid', upload.single('pdf'), uploadPDFHybrid);
router.post('/search-hybrid', hybridSearch);
router.post('/compare-search', compareSearchMethods);
router.get('/status', getSystemStatus);

export default router;
