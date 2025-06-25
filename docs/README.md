# 📚 AI Helpers Documentation

This directory contains comprehensive documentation for the AI Helpers project.

## 🗂️ Documentation Structure

### 📋 **Setup Guides** (`/setup/`)
- [**PDF Embedding Setup**](./setup/PDF_EMBEDDING_SETUP.md) - Complete guide for vector search setup
- [**Hybrid RAG Quickstart**](./setup/HYBRID_RAG_QUICKSTART.md) - Getting started with Neo4j + pgvector

### 🔧 **Features** (`/features/`)
- [**Neo4j Integration Plan**](./features/NEO4J_INTEGRATION_PLAN.md) - Technical architecture and roadmap

### 📖 **Quick Start**

1. **PDF Embedding System** - Upload and search PDFs with vector similarity
2. **Hybrid RAG System** - Enhanced search with knowledge graphs
3. **Image Analysis** - AI-powered image understanding
4. **File Management** - Cloud storage integration

## 🚀 **API Endpoints Overview**

| Feature | Endpoint | Description |
|---------|----------|-------------|
| PDF Search | `/pdf/*` | Vector-based document search |
| Hybrid RAG | `/hybrid/*` | Knowledge graph + vector search |
| Image Analysis | `/image/*` | AI image understanding |
| File Upload | `/file/*` | Cloud file management |

## 🛠️ **Development Setup**

1. Clone repository
2. Install dependencies: `bun install`
3. Configure environment variables
4. **Setup infrastructure**: `bun run setup:neo4j` (automated)
5. **Setup database**: `bun run setup:database` 
6. Start development server: `bun start`

### **Infrastructure Commands**
```bash
# Automated Neo4j + pgvector setup
bun run setup:neo4j

# Database migration only
bun run setup:database

# Docker commands
bun run docker:neo4j        # Start Neo4j container
bun run docker:neo4j:down   # Stop Neo4j container
```

See [`infrastructure/`](../infrastructure/README.md) for detailed infrastructure documentation.

## 📞 **Support**

For technical questions, refer to the specific setup guides in this documentation.
