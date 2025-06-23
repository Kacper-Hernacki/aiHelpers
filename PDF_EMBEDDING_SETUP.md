# PDF Embedding with LangChain and pgvector

This implementation provides endpoints to embed large PDFs into a PostgreSQL vector database using LangChain and pgvector.

## Prerequisites

1. **PostgreSQL with pgvector extension**
2. **OpenAI API Key** for embeddings
3. **Environment variables configured**

## Database Setup

### 1. Enable pgvector extension in PostgreSQL

Connect to your PostgreSQL database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Run Prisma migration

```bash
bunx prisma migrate dev --name add_document_embeddings
```

If the migration fails due to database connectivity, you can manually create the table:

```sql
CREATE TABLE document_embeddings (
  id SERIAL PRIMARY KEY,
  document_id VARCHAR UNIQUE NOT NULL,
  filename VARCHAR NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX idx_document_embeddings_chunk_index ON document_embeddings(chunk_index);
```

### 3. Environment Variables

Ensure your `.env` file contains:

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_postgresql_connection_string
```

## API Endpoints

### 1. Upload and Embed PDF

**POST** `/pdf/embed`

- **Content-Type**: `multipart/form-data`
- **Field name**: `pdf`
- **Max file size**: 100MB

```bash
curl -X POST http://localhost:3000/pdf/embed \
  -F "pdf=@/path/to/your/document.pdf"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid-generated-id",
    "filename": "document.pdf",
    "message": "PDF successfully embedded into vector database"
  }
}
```

### 2. Search Similar Chunks

**POST** `/pdf/search`

```bash
curl -X POST http://localhost:3000/pdf/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "limit": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "What is machine learning?",
    "results": [
      {
        "documentId": "uuid",
        "filename": "document.pdf",
        "content": "Machine learning is...",
        "chunkIndex": 0,
        "similarity": 0.85,
        "metadata": { ... }
      }
    ]
  }
}
```

### 3. Get All Documents

**GET** `/pdf/documents`

```bash
curl http://localhost:3000/pdf/documents
```

### 4. Get Document Chunks

**GET** `/pdf/documents/:documentId/chunks`

```bash
curl http://localhost:3000/pdf/documents/your-document-id/chunks
```

### 5. Delete Document

**DELETE** `/pdf/documents/:documentId`

```bash
curl -X DELETE http://localhost:3000/pdf/documents/your-document-id
```

## Features

- ✅ **Large PDF support** - Handles PDFs up to 100MB
- ✅ **Intelligent chunking** - Uses RecursiveCharacterTextSplitter with 1000 char chunks and 200 char overlap
- ✅ **Rate limiting** - Processes embeddings in batches to respect OpenAI rate limits
- ✅ **Vector similarity search** - Uses cosine similarity for finding relevant chunks
- ✅ **Metadata tracking** - Stores chunk size, model info, and processing timestamps
- ✅ **Error handling** - Comprehensive error handling and logging
- ✅ **File cleanup** - Automatically removes uploaded files after processing

## Technical Details

### Embedding Model
- **Model**: `text-embedding-3-small` (1536 dimensions)
- **Cost efficient** and fast processing
- **High quality** embeddings for semantic search

### Text Processing
- **Chunk size**: 1000 characters
- **Overlap**: 200 characters
- **Separators**: `\n\n`, `\n`, ` `, `''`

### Database Storage
- **Vector type**: `vector(1536)` for pgvector compatibility
- **Indexing**: Optimized for fast similarity searches
- **Metadata**: JSON storage for flexible chunk information

## Testing

Upload a test PDF and search for content:

```bash
# Upload PDF
curl -X POST http://localhost:3000/pdf/embed \
  -F "pdf=@test-document.pdf"

# Search for content
curl -X POST http://localhost:3000/pdf/search \
  -H "Content-Type: application/json" \
  -d '{"query": "key concept from your PDF", "limit": 3}'
```

## Memory Usage

The implementation processes PDFs in memory-efficient batches:
- **Batch size**: 5 chunks at a time
- **Delay**: 1 second between batches
- **Memory cleanup**: Files are removed after processing

## Troubleshooting

1. **Database connection issues**: Verify `DATABASE_URL` and database accessibility
2. **pgvector not found**: Ensure `CREATE EXTENSION vector;` was run
3. **OpenAI rate limits**: The service includes automatic batching and delays
4. **Large files**: Increase `fileSize` limit in multer configuration if needed

## Performance Notes

- **Embedding generation**: ~1-2 seconds per batch of 5 chunks
- **Database insertion**: Optimized with raw SQL for vector types
- **Search speed**: Sub-second for typical document collections
- **Storage**: ~2KB per chunk (including embedding vectors)
