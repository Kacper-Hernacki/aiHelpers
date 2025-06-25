# 🤖 AI Helpers

> **Enterprise-grade AI API service** with hybrid RAG, vector search, and intelligent document processing.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-orange.svg)](https://neo4j.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-blue.svg)](https://github.com/pgvector/pgvector)

## 🚀 **Key Features**

### **🧠 Hybrid RAG System**
- **Vector Search** (pgvector) + **Knowledge Graphs** (Neo4j)
- **30-50% better search relevance** vs pure vector search
- **Cross-document relationships** and **multi-hop reasoning**
- **Entity extraction** and **contextual understanding**

### **📄 PDF Intelligence**
- Large PDF processing (up to 100MB)
- Semantic chunking and embedding
- Batch processing with rate limiting
- Advanced text cleaning and validation

### **🖼️ Image Analysis**
- AI-powered image understanding (GPT-4o)
- Text extraction and object detection
- Social media content analysis
- Batch image processing

### **☁️ Cloud Integration**
- Digital Ocean Spaces storage
- ComfyUI API integration
- Automated file management
- CDN-optimized delivery

## ⚡ **Quick Start**

```bash
# Install dependencies
bun install

# Start development server
bun start

# Run tests
bun run test:hybrid
```

## 📖 **What is AI Helpers?**

AI Helpers is a comprehensive API service built with Node.js/Express that provides various AI-powered utilities including:

- **🔍 Hybrid RAG System** - Combines vector search (pgvector) with knowledge graphs (Neo4j) for superior document retrieval
- **📄 PDF Intelligence** - Advanced PDF processing with semantic search and entity extraction  
- **🖼️ Image Analysis** - AI-powered image understanding using GPT-4o for text extraction and content analysis
- **☁️ File Management** - Seamless cloud storage integration with Digital Ocean Spaces
- **🎥 Video Processing** - YouTube transcript extraction and content analysis
- **📝 Content Creation** - Social media content generation and analysis tools
- **✈️ Travel Integration** - Flight search and vacation planning utilities
- **🔗 Platform Integration** - LinkedIn, Notion, and other third-party service connections

The platform is designed for enterprise use with robust error handling, rate limiting, batch processing, and production-ready deployment automation.

## 🎯 **API Endpoints**

### **🧠 Hybrid RAG System**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hybrid/upload-hybrid` | POST | Upload PDF with hybrid embedding (vector + graph) |
| `/hybrid/search-hybrid` | POST | Advanced search with knowledge graph traversal |
| `/hybrid/compare-search` | POST | Compare vector vs hybrid search results |
| `/hybrid/status` | GET | System health and Neo4j connectivity status |

### **📄 PDF Management**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pdf/embed` | POST | Upload and embed PDFs with vector search |
| `/pdf/search` | POST | Semantic document search with cosine similarity |
| `/pdf/documents` | GET | List all uploaded documents |
| `/pdf/documents/:id/chunks` | GET | Get document text chunks |
| `/pdf/documents/:id` | DELETE | Delete document and embeddings |

### **🖼️ Image Analysis**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/image/analyze-image` | POST | Single image analysis with GPT-4o |
| `/image/analyze-multiple-images` | POST | Batch image analysis with consolidation |

### **☁️ File Management**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/file/upload` | POST | Single file upload to Digital Ocean Spaces |
| `/file/upload-multiple` | POST | Multiple file upload with batch processing |
| `/file/info/:filename` | GET | Get file metadata and information |
| `/file/download/:filename` | GET | Download or stream files |

### **🎥 Content Processing**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/youtube/transcript` | POST | Extract YouTube video transcripts |
| `/notes/add/youtube` | POST | Create notes from YouTube content |

### **🔗 Integrations**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notion/calendar/vacation` | GET | Notion vacation calendar data |
| `/flights/search` | GET | Flight search with multiple APIs |
| `/flights/search/serp` | GET | SERP-powered flight search |

### **🎨 AI Image Generation (ComfyICU)**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/comfyicu/run` | POST | Run AI image generation workflows |
| `/comfyicu/workflows/:id/runs/:run_id` | GET | Check workflow run status |
| `/comfyicu/generate-image` | POST | Simple image generation interface |
| `/comfyicu/face-swap` | POST | AI-powered face swapping |
| `/comfyicu/face-swap-upload` | POST | Face swap with file upload |
| `/comfyicu/test-connection` | GET | Test ComfyICU API connectivity |

## 📚 **Documentation**

| Guide | Description |
|-------|-------------|
| [**📋 Complete Documentation**](./docs/README.md) | Full documentation index |
| [**🔧 PDF Setup Guide**](./docs/setup/PDF_EMBEDDING_SETUP.md) | Vector search configuration |
| [**🚀 Hybrid RAG Guide**](./docs/setup/HYBRID_RAG_QUICKSTART.md) | Neo4j + pgvector setup |
| [**🏗️ Architecture Plan**](./docs/features/NEO4J_INTEGRATION_PLAN.md) | Technical architecture |

## 🛠️ **Tech Stack**

- **Runtime**: Node.js + Bun + TypeScript
- **Framework**: Express.js
- **Databases**: PostgreSQL (pgvector) + Neo4j
- **AI**: OpenAI GPT-4o + Text Embeddings
- **Storage**: Digital Ocean Spaces
- **Processing**: LangChain + PDF.js

## 🚢 **Deployment**

Automated deployment via GitHub Actions to production servers with Docker containerization.

## 📞 **Support**

For detailed setup instructions and API usage, see the [documentation](./docs/README.md).
