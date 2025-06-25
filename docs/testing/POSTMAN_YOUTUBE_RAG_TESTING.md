# Testing YouTube RAG API with Postman

## Overview
Test the YouTube RAG integration endpoints using Postman to process YouTube video transcripts for hybrid RAG with pgvector embeddings and Neo4j knowledge graph.

## Prerequisites
- Server running on `http://localhost:3000`
- OpenAI API key configured in environment variables

## Available Endpoints

### 1. YouTube RAG Processing
**POST** `http://localhost:3000/youtube/process-for-rag`

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "language": "en"
}
```

**Response:** Structured data for pgvector and Neo4j integration

### 2. YouTube RAG with Examples  
**POST** `http://localhost:3000/youtube/process-with-examples`

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "language": "en"
}
```

**Response:** Data + SQL/Cypher implementation examples

## Quick Test Steps

### Step 1: Basic RAG Processing
1. Open Postman
2. Create POST request to: `http://localhost:3000/youtube/process-for-rag`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
}
```
5. Send request
6. Verify response contains:
   - `pgvectorData.chunks` (text chunks with embeddings)
   - `neo4jData.entities` (extracted entities)
   - `neo4jData.relationships` (entity relationships)

### Step 2: Test with Implementation Examples
1. Change URL to: `http://localhost:3000/youtube/process-with-examples`
2. Same request body
3. Send request
4. Verify response includes `implementationExamples` with SQL and Cypher queries

## Sample Test URLs
- Short tutorial: `https://www.youtube.com/watch?v=jNQXAC9IVRw`
- TED Talk: `https://www.youtube.com/watch?v=ZQUxL4Jm1Lo`

## Expected Response Structure
```json
{
  "success": true,
  "data": {
    "pgvectorData": {
      "documentId": "youtube_videoId_timestamp",
      "chunks": [
        {
          "id": "chunk_uuid",
          "content": "Text content...",
          "embedding": [0.1, 0.2, ...],
          "metadata": { ... }
        }
      ],
      "documentMetadata": { ... }
    },
    "neo4jData": {
      "videoNode": { ... },
      "entities": [
        {
          "name": "Entity Name",
          "type": "PERSON",
          "confidence": 0.9,
          "chunkId": "chunk_uuid"
        }
      ],
      "relationships": [
        {
          "source": "Entity1",
          "target": "Entity2",
          "type": "RELATES_TO",
          "confidence": 0.8,
          "context": "Relationship context"
        }
      ]
    }
  }
}
```

## Processing Times
- Short videos (5-10 min): 30-60 seconds
- Medium videos (10-30 min): 1-3 minutes

## Common Issues
- **"Error getting transcript"**: Use public videos with available transcripts
- **"OpenAI API Error"**: Check OPENAI_API_KEY in environment
- **Timeout**: Use shorter videos for testing

---

**Note:** This service prepares data for hybrid RAG. Database insertion should be implemented separately using the returned structured data.
