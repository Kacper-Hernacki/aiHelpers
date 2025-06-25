#!/usr/bin/env bun

import express from 'express';

const app = express();
app.use(express.json());

// Test the hybrid routes import
import hybridRAGRoutes from './routes/hybridRAG.routes.ts';

app.use('/hybrid', hybridRAGRoutes);

// Simple test endpoint  
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', routes: 'loaded' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  POST /hybrid/upload-hybrid - Upload PDF with hybrid processing');
  console.log('  POST /hybrid/search-hybrid - Hybrid search');
  console.log('  POST /hybrid/compare-search - Compare search methods');
  console.log('  GET  /hybrid/status - System status');
});
