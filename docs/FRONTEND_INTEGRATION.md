# Frontend Integration Guide

The AI Fashion Agent backend is ready for frontend integration. Here are the key details and examples:

## API Endpoints

### Health Check
```
GET /ai-fashion-agent/health
```

### Generate Outfit
```
POST /ai-fashion-agent/generate-outfit
```

## Frontend Integration Examples

### React/Next.js Example

```tsx
import { useState } from 'react';

interface FashionApiResponse {
  status: string;
  data: {
    generatedImageUrl: string;
    generatedImageBase64: string;
    prompt: string;
    clothingCount: number;
  };
}

export default function FashionGenerator() {
  const [modelImage, setModelImage] = useState<string>('');
  const [clothingImages, setClothingImages] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (file: File, isModel: boolean = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (isModel) {
        setModelImage(base64);
      } else {
        setClothingImages(prev => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateOutfit = async () => {
    if (!modelImage || clothingImages.length === 0) {
      alert('Please upload a model image and at least one clothing item');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/ai-fashion-agent/generate-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelImageUrl: modelImage,
          clothingImages: clothingImages,
          prompt: 'Create a stylish outfit combining all these clothing items'
        })
      });

      const result: FashionApiResponse = await response.json();
      
      if (result.status === 'success') {
        setGeneratedImage(result.data.generatedImageUrl);
      } else {
        alert('Error generating outfit');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate outfit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fashion-generator">
      <h1>AI Fashion Generator</h1>
      
      {/* Model Image Upload */}
      <div>
        <h3>Upload Model Photo</h3>
        <input 
          type="file" 
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
        />
        {modelImage && <img src={modelImage} alt="Model" style={{width: '200px'}} />}
      </div>

      {/* Clothing Images Upload */}
      <div>
        <h3>Upload Clothing Items</h3>
        <input 
          type="file" 
          accept="image/*"
          multiple
          onChange={(e) => {
            Array.from(e.target.files || []).forEach(file => handleImageUpload(file, false));
          }}
        />
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          {clothingImages.map((img, index) => (
            <img key={index} src={img} alt={`Clothing ${index}`} style={{width: '100px'}} />
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button onClick={generateOutfit} disabled={loading || !modelImage || clothingImages.length === 0}>
        {loading ? 'Generating...' : 'Generate Outfit'}
      </button>

      {/* Result */}
      {generatedImage && (
        <div>
          <h3>Generated Outfit</h3>
          <img src={generatedImage} alt="Generated Outfit" style={{maxWidth: '400px'}} />
        </div>
      )}
    </div>
  );
}
```

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>AI Fashion Generator</title>
</head>
<body>
    <h1>AI Fashion Generator</h1>
    
    <div>
        <h3>Model Photo</h3>
        <input type="file" id="modelInput" accept="image/*">
        <img id="modelPreview" style="width: 200px; display: none;">
    </div>
    
    <div>
        <h3>Clothing Items</h3>
        <input type="file" id="clothingInput" accept="image/*" multiple>
        <div id="clothingPreviews" style="display: flex; gap: 10px;"></div>
    </div>
    
    <button id="generateBtn" disabled>Generate Outfit</button>
    <div id="result"></div>

    <script>
        let modelImage = '';
        let clothingImages = [];

        // Handle model image upload
        document.getElementById('modelInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    modelImage = e.target.result;
                    document.getElementById('modelPreview').src = modelImage;
                    document.getElementById('modelPreview').style.display = 'block';
                    checkInputs();
                };
                reader.readAsDataURL(file);
            }
        });

        // Handle clothing images upload
        document.getElementById('clothingInput').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const previews = document.getElementById('clothingPreviews');
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    clothingImages.push(e.target.result);
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100px';
                    previews.appendChild(img);
                    
                    checkInputs();
                };
                reader.readAsDataURL(file);
            });
        });

        function checkInputs() {
            const btn = document.getElementById('generateBtn');
            btn.disabled = !modelImage || clothingImages.length === 0;
        }

        // Generate outfit
        document.getElementById('generateBtn').addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Generating...';

            try {
                const response = await fetch('/ai-fashion-agent/generate-outfit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        modelImageUrl: modelImage,
                        clothingImages: clothingImages,
                        prompt: 'Create a stylish outfit combining all these clothing items'
                    })
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    document.getElementById('result').innerHTML = `
                        <h3>Generated Outfit</h3>
                        <img src="${result.data.generatedImageUrl}" style="max-width: 400px;">
                        <p>Combined ${result.data.clothingCount} clothing items</p>
                    `;
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to generate outfit');
            } finally {
                this.disabled = false;
                this.textContent = 'Generate Outfit';
            }
        });
    </script>
</body>
</html>
```

## Environment Setup for Frontend Development

### 1. Set Required API Keys
Create `.env.local` file:
```bash
# Required
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
DEFAULT_MODEL_IMAGE_URL=https://your-domain.com/default-model.jpg
YOUR_SITE_URL=http://localhost:3000
```

### 2. Start the Backend
```bash
npm run build
npm start
```

### 3. Test Health Check
```bash
curl http://localhost:3000/ai-fashion-agent/health
```

## Frontend Features You Can Build

### Basic Features
- ✅ Image upload (model + clothing items)
- ✅ Base64 conversion for API calls
- ✅ Loading states during generation
- ✅ Error handling
- ✅ Result display

### Advanced Features
- 📁 **Drag & Drop Upload**: Better UX for image uploads
- 🎨 **Custom Prompts**: Let users customize the generation prompt
- 💾 **Save Results**: Store generated outfits locally/database
- 🔄 **Regenerate**: Try different combinations
- 📱 **Mobile Responsive**: Works on all devices
- 🎯 **Preset Models**: Pre-loaded model images to choose from
- 🏷️ **Clothing Categories**: Organize uploads by type (shirts, pants, etc.)

## API Response Structure

```typescript
interface FashionApiResponse {
  status: 'success' | 'error';
  data?: {
    generatedImageUrl: string;      // Full data URL with base64
    generatedImageBase64: string;   // Just the base64 part
    prompt: string;                 // The prompt used
    clothingCount: number;          // Number of items combined
  };
  message?: string;                 // Error message if status is 'error'
}
```

The backend is now ready! Just add your `OPENROUTER_API_KEY` and you can start building your frontend.