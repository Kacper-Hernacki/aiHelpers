// test-specific-template.mjs
import fetch from 'node-fetch';

// Test data with a more specific title that includes a colon
const testData = {
  replicateResponse: [
    {
      "output": "https://picsum.photos/800/800"  // Placeholder image for testing
    }
  ],
  title: "Social Platforms: Top Trends for 2025"
};

// Function to test the endpoint
async function testTemplateEndpoint() {
  try {
    console.log("Testing social card generation with specific title...");
    
    // Send the test data to our endpoint
    const response = await fetch('http://localhost:3000/template/generate-thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    // Parse the response
    const result = await response.json();
    console.log("Response:", JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log("✅ Test passed! Social card generated successfully.");
      console.log("Preview URL:", result.data.url);
      
      // Open the image URL in the default browser
      const openCommand = process.platform === 'darwin' ? 'open' : 
                         process.platform === 'win32' ? 'start' : 'xdg-open';
      const { exec } = await import('child_process');
      exec(`${openCommand} ${result.data.url}`);
    } else {
      console.log("❌ Test failed:", result.message);
    }
  } catch (error) {
    console.error("Error testing endpoint:", error);
  }
}

// Run the test
testTemplateEndpoint();

export {}; // Add this line to make TypeScript treat this as a module
