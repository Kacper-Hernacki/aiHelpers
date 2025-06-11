// test-canvas-direct.mjs
import { socialCardTemplateService } from './services/template/socialCardTemplate.service.ts';
import fs from 'fs';
import path from 'path';

const testData = {
  imageUrl: 'https://picsum.photos/800/800',
  title: 'Direct Test: A New Hope for Social Cards',
};

async function runDirectTest() {
  console.log('Running direct canvas test...');
  try {
    const result = await socialCardTemplateService.createSocialCard(testData.imageUrl, testData.title);

    if (result.success) {
      console.log('✅ Direct test passed! Social card generated successfully.');
      console.log('File data:', result.data);

      // The result from uploadFile is an object with a URL.
      // To test locally, we'd need to modify the service to return the buffer
      // or save it to a file before uploading. For now, we'll just log the success.
      console.log(`You can view the generated image at: ${result.data.url}`);

    } else {
      console.log('❌ Direct test failed:', result.message);
    }
  } catch (error) {
    console.error('Error during direct test:', error);
  }
}

runDirectTest();
