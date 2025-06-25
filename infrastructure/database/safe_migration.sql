-- Safe migration to add document_embeddings table only
-- This will NOT affect any existing data

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create the document_embeddings table
CREATE TABLE IF NOT EXISTS "document_embeddings" (
    "id" SERIAL NOT NULL,
    "document_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "chunk_content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance (only if table was created)
CREATE INDEX IF NOT EXISTS "document_embeddings_document_id_idx" ON "document_embeddings"("document_id");
CREATE INDEX IF NOT EXISTS "document_embeddings_chunk_index_idx" ON "document_embeddings"("chunk_index");

-- Note: Removed the unique constraint on document_id to allow multiple chunks per document
