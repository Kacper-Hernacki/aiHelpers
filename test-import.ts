#!/usr/bin/env bun

// Test hybrid routes import
try {
  console.log('🧪 Testing hybrid routes import...');
  
  const hybridRoutes = await import('./routes/hybridRAG.routes.ts');
  console.log('✅ Hybrid routes imported successfully');
  
  // Test routes index import
  const routesIndex = await import('./routes/index.ts');
  console.log('✅ Routes index imported successfully');
  
  console.log('\n🎉 All route imports working correctly!');
  console.log('\n📚 Available hybrid endpoints:');
  console.log('  POST /hybrid/upload-hybrid - Upload PDF with hybrid processing');
  console.log('  POST /hybrid/search-hybrid - Hybrid search');  
  console.log('  POST /hybrid/compare-search - Compare search methods');
  console.log('  GET  /hybrid/status - System status');
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
}
