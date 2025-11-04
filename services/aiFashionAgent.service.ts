import fetch from "node-fetch";

interface FashionCombinationRequest {
  modelImageUrl: string;
  clothingImages: string[]; // Base64 encoded images or URLs
  prompt: string;
}

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content?: string;
      images?: Array<{
        image_url: {
          url: string;
        };
      }>;
    };
  }>;
}

class AiFashionAgentService {
  private readonly openRouterBaseUrl = "https://openrouter.ai/api/v1/chat/completions";
  private readonly modelName = "google/gemini-2.5-flash-image-preview";

  /**
   * Generate outfit combination using OpenRouter Gemini model
   */
  async generateOutfitCombination(request: FashionCombinationRequest): Promise<{
    generatedImageUrl?: string;
    generatedImageBase64?: string;
    prompt: string;
    clothingCount: number;
  }> {
    try {
      // Build the message content array starting with the text prompt
      const messageContent: OpenRouterMessage["content"] = [
        {
          type: "text",
          text: request.prompt
        }
      ];

      // Add the model image
      messageContent.push({
        type: "image_url",
        image_url: {
          url: this.formatImageUrl(request.modelImageUrl)
        }
      });

      // Add all clothing images
      request.clothingImages.forEach(clothingImage => {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: this.formatImageUrl(clothingImage)
          }
        });
      });

      // Prepare the OpenRouter request
      const openRouterRequest: OpenRouterRequest = {
        model: this.modelName,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ]
      };

      // Make the API call
      const response = await this.callOpenRouter(openRouterRequest);

      // Parse the response
      const result = this.parseOpenRouterResponse(response);

      return {
        generatedImageUrl: result.imageUrl,
        generatedImageBase64: result.imageBase64,
        prompt: request.prompt,
        clothingCount: request.clothingImages.length
      };

    } catch (error) {
      console.error("Error in generateOutfitCombination:", error);
      throw new Error(`Failed to generate outfit combination: ${error}`);
    }
  }

  /**
   * Format image URL to ensure it's properly formatted for OpenRouter
   */
  private formatImageUrl(imageInput: string): string {
    // If it's already a data URL, return as is
    if (imageInput.startsWith('data:image/')) {
      return imageInput;
    }

    // If it's a regular URL, return as is
    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      return imageInput;
    }

    // If it's base64 without the data URL prefix, add it
    if (this.isBase64(imageInput)) {
      return `data:image/png;base64,${imageInput}`;
    }

    // Otherwise, assume it's a URL
    return imageInput;
  }

  /**
   * Check if a string is base64 encoded
   */
  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  /**
   * Make API call to OpenRouter
   */
  private async callOpenRouter(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    const response = await fetch(this.openRouterBaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Fashion Agent'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const result = await response.json() as OpenRouterResponse;
    return result;
  }

  /**
   * Parse OpenRouter response and extract image data
   */
  private parseOpenRouterResponse(response: OpenRouterResponse): {
    imageUrl?: string;
    imageBase64?: string;
  } {
    try {
      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error("No choices in OpenRouter response");
      }

      // Check for images in the response
      if (choice.message.images && choice.message.images.length > 0) {
        const imageUrl = choice.message.images[0].image_url.url;
        
        // If it's a data URL, extract the base64 part
        if (imageUrl.startsWith('data:image/')) {
          const base64Data = imageUrl.split(',')[1];
          return {
            imageUrl: imageUrl,
            imageBase64: base64Data
          };
        }
        
        return {
          imageUrl: imageUrl
        };
      }

      // Fallback: check if content contains image data
      if (choice.message.content) {
        // This is a fallback for different response formats
        console.warn("No images found in expected format, checking content");
        return {};
      }

      throw new Error("No image data found in OpenRouter response");

    } catch (error) {
      console.error("Error parsing OpenRouter response:", error);
      throw new Error(`Failed to parse OpenRouter response: ${error}`);
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: string;
    apiKeyConfigured: boolean;
    modelName: string;
  }> {
    return {
      status: "ok",
      apiKeyConfigured: !!process.env.OPENROUTER_API_KEY,
      modelName: this.modelName
    };
  }
}

export const aiFashionAgentService = new AiFashionAgentService();