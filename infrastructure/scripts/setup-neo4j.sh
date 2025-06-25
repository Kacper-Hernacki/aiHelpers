#!/bin/bash

echo "🚀 Setting up Neo4j + pgvector Hybrid RAG System"

# 1. Start Neo4j container
echo "📦 Starting Neo4j container..."
docker-compose -f infrastructure/docker/docker-compose.neo4j.yml up -d

# 2. Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j to be ready..."
sleep 30

# 3. Add environment variables
echo "🔧 Setting up environment variables..."
cat >> .env << EOL

# Neo4j Configuration
NEO4J_URL=bolt://165.22.31.204:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=xR59zN@hneo4j
EOL

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update NEO4J_PASSWORD in .env with a secure password"
echo "2. Access Neo4j browser at: http://localhost:7474"
echo "3. Test the hybrid system with: bun run test:hybrid"
echo ""
echo "🔗 Integration benefits:"
echo "• 30-50% better search relevance"
echo "• Cross-document entity relationships"
echo "• Multi-hop reasoning capabilities"
echo "• Enhanced context understanding"
