# AI Fashion Agent API

A clean REST API implementation of the n8n AI Fashion Bot workflow. This endpoint combines clothing items with a model image to generate stylish outfit combinations using OpenRouter's Gemini model.

## Required API Keys

### 🔑 OPENROUTER_API_KEY (Required)
- **Purpose**: Access to OpenRouter's Gemini 2.5 Flash Image Preview model
- **Get it from**: [OpenRouter.ai](https://openrouter.ai/)
- **Set in**: `.env.local` or `.env.production`
- **Format**: `OPENROUTER_API_KEY=your_api_key_here`

### 🔑 DEFAULT_MODEL_IMAGE_URL (Optional)
- **Purpose**: Default model image URL when not provided in request
- **Format**: `DEFAULT_MODEL_IMAGE_URL=https://your-domain.com/model-image.jpg`
- **Alternative**: Provide `modelImageUrl` in each request

### 🔑 YOUR_SITE_URL (Optional)
- **Purpose**: HTTP referer header for OpenRouter API calls
- **Default**: `http://localhost:3000`
- **Format**: `YOUR_SITE_URL=https://yourdomain.com`

## Endpoints

### Health Check
```
GET /ai-fashion-agent/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "AI Fashion Agent Health Check",
  "apiKeys": {
    "required": {
      "OPENROUTER_API_KEY": true
    },
    "optional": {
      "DEFAULT_MODEL_IMAGE_URL": false
    }
  },
  "ready": true
}
```

### Generate Outfit
```
POST /ai-fashion-agent/generate-outfit
Content-Type: application/json
```

**Request Body:**
```json
{
  "modelImageUrl": "https://example.com/model.jpg", // Optional if DEFAULT_MODEL_IMAGE_URL is set
  "clothingImages": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...", // Base64 encoded image
    "https://example.com/shirt.jpg", // Or URL
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..." // Multiple items
  ],
  "prompt": "Custom prompt for outfit generation" // Optional
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "generatedImageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "generatedImageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "prompt": "Generate a single image of the model wearing ALL 3 clothing items provided...",
    "clothingCount": 3
  }
}
```

## Usage Examples

### Using cURL
```bash
curl -X POST http://localhost:3000/ai-fashion-agent/generate-outfit \
  -H "Content-Type: application/json" \
  -d '{
    "modelImageUrl": "https://example.com/model.jpg",
    "clothingImages": [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "https://example.com/clothing-item.jpg"
    ]
  }'
```

### Using JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/ai-fashion-agent/generate-outfit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    modelImageUrl: 'https://example.com/model.jpg',
    clothingImages: [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      'https://example.com/shirt.jpg'
    ],
    prompt: 'Create a casual summer outfit'
  })
});

const result = await response.json();
console.log(result.data.generatedImageUrl);
```

## Error Handling

### Missing API Key
```json
{
  "status": "error",
  "message": "OPENROUTER_API_KEY is required but not configured",
  "requiredApiKeys": ["OPENROUTER_API_KEY"]
}
```

### Invalid Request
```json
{
  "status": "error",
  "message": "clothingImages array is required and must contain at least one image"
}
```

### OpenRouter API Error
```json
{
  "status": "error",
  "message": "Failed to generate outfit combination: OpenRouter API error (401): Invalid API key"
}
```

## Image Format Support

- **Base64 encoded images**: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...`
- **Image URLs**: `https://example.com/image.jpg`
- **Supported formats**: PNG, JPEG, WebP
- **Automatic format detection**: The service automatically handles different input formats

## Differences from n8n Version

This API implementation provides several improvements over the original n8n workflow:

1. **Cleaner Error Handling**: Proper HTTP status codes and structured error responses
2. **Flexible Input**: Supports both URLs and base64 images
3. **Better Validation**: Input validation before processing
4. **Health Monitoring**: Health check endpoint for monitoring
5. **Environment Configuration**: Clear environment variable setup
6. **No File Storage**: Direct processing without temporary file storage
7. **Structured Responses**: Consistent JSON response format

## Notes

- The service processes images in memory without saving temporary files
- Default prompt generates cohesive outfits combining all provided clothing items
- Response includes both URL and base64 formats for flexibility
- Built to handle the multi-image processing that n8n struggled with