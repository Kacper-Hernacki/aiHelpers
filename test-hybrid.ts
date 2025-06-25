#!/usr/bin/env bun

import { Neo4jService } from './services/graph/neo4j.service.js';
import { EntityExtractorService } from './services/graph/entityExtractor.service.js';

async function testHybridSetup() {
  console.log('🧪 Testing Hybrid RAG Setup...\n');

  try {
    // Test 1: Neo4j Connection
    console.log('1️⃣ Testing Neo4j connection...');
    const neo4j = new Neo4jService();
    const isConnected = await neo4j.testConnection();
    
    if (isConnected) {
      console.log('✅ Neo4j connected successfully');
    } else {
      console.log('❌ Neo4j connection failed');
      console.log('💡 Run: ./setup-neo4j.sh to start Neo4j');
      return;
    }

    // Test 2: Entity Extraction
    console.log('\n2️⃣ Testing entity extraction...');
    const extractor = new EntityExtractorService();
    const testText = "OpenAI released GPT-4, a large language model, in collaboration with Microsoft Corporation in San Francisco.";
    
    const entities = await extractor.extractQueryEntities("OpenAI GPT-4 Microsoft");
    console.log('✅ Entity extraction working');
    console.log('📋 Sample entities:', entities);

    // Test 3: Graph Operations
    console.log('\n3️⃣ Testing graph operations...');
    
    // Create test document
    await neo4j.createDocumentNode('test-doc-1', 'test.pdf', { testFlag: 'true' });
    
    // Create test entities
    const testEntities: any[] = [
      {
        id: 'openai_entity',
        type: 'ORGANIZATION',
        name: 'OpenAI',
        properties: { description: 'AI research company' }
      },
      {
        id: 'gpt4_entity', 
        type: 'CONCEPT',
        name: 'GPT-4',
        properties: { description: 'Large language model' }
      }
    ];

    const testRelationships: any[] = [
      {
        from: 'openai_entity',
        to: 'gpt4_entity',
        type: 'RELATES_TO',
        properties: { confidence: 0.9 }
      }
    ];

    await neo4j.createEntitiesAndRelationships('test-doc-1', testEntities, testRelationships);
    console.log('✅ Graph operations working');

    // Test 4: Graph Query
    console.log('\n4️⃣ Testing graph queries...');
    const relatedDocs = await neo4j.findRelatedDocuments(['openai_entity']);
    console.log('✅ Graph queries working');
    console.log('📋 Found related documents:', relatedDocs);

    console.log('\n🎉 Hybrid RAG setup is working perfectly!');
    console.log('\n🚀 Ready to process PDFs with:');
    console.log('   • Vector embeddings (semantic similarity)');
    console.log('   • Knowledge graphs (entity relationships)');
    console.log('   • Cross-document connections');
    console.log('   • Multi-hop reasoning');

    await neo4j.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Neo4j is running: ./setup-neo4j.sh');
    console.log('2. Check environment variables in .env');
    console.log('3. Verify OPENAI_API_KEY is set');
  }
}

// Run the test
testHybridSetup();
