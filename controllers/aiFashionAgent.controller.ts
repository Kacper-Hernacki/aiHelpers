import { Request, Response } from "express";
import { aiFashionAgentService } from "../services/aiFashionAgent.service";
import { fileProcessorService } from "../services/file/fileProcessor.service";

interface FashionRequest {
  modelImageUrl?: string;
  clothingImages: string[]; // Base64 encoded images or URLs
  prompt?: string;
}

type AiFashionAgentController = {
  generateOutfit: (req: Request, res: Response) => Promise<void>;
  healthCheck: (req: Request, res: Response) => void;
};

export const aiFashionAgentController: AiFashionAgentController = {
  /**
   * Generate fashion outfit combining model image with clothing items
   * Endpoint: POST /ai-fashion-agent/generate-outfit
   * 
   * Required API Keys:
   * - OPENROUTER_API_KEY: For OpenRouter Gemini model access
   * 
   * Request body can be:
   * 1. JSON with modelImageUrl and clothingImages (base64 or URLs)
   * 2. Multipart form with file uploads
   */
  generateOutfit: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check required API keys
      if (!process.env.OPENROUTER_API_KEY) {
        res.status(500).json({
          status: "error",
          message: "OPENROUTER_API_KEY is required but not configured",
          requiredApiKeys: ["OPENROUTER_API_KEY"]
        });
        return;
      }

      // Handle multipart file uploads
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        res.status(501).json({
          status: "error",
          message: "File upload endpoint not yet implemented. Please use JSON format with base64 images or URLs."
        });
        return;
      }

      // Handle JSON request
      const { modelImageUrl, clothingImages, prompt }: FashionRequest = req.body;

      // Validate request
      if (!clothingImages || !Array.isArray(clothingImages) || clothingImages.length === 0) {
        res.status(400).json({
          status: "error",
          message: "clothingImages array is required and must contain at least one image"
        });
        return;
      }

      // Use default model image if not provided
      const finalModelImageUrl = modelImageUrl || process.env.DEFAULT_MODEL_IMAGE_URL;
      
      if (!finalModelImageUrl) {
        res.status(400).json({
          status: "error",
          message: "modelImageUrl is required (either in request or set DEFAULT_MODEL_IMAGE_URL environment variable)"
        });
        return;
      }

      // Process the fashion combination
      const result = await aiFashionAgentService.generateOutfitCombination({
        modelImageUrl: finalModelImageUrl,
        clothingImages,
        prompt: prompt || `Generate a single image of the model wearing ALL ${clothingImages.length} clothing items provided. Combine all the clothing pieces onto the model in one cohesive, stylish outfit.`
      });

      res.status(200).json({
        status: "success",
        data: result
      });

    } catch (error) {
      console.error("Error in AI Fashion Agent generateOutfit:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },


  /**
   * Health check endpoint
   */
  healthCheck: (req: Request, res: Response): void => {
    const requiredKeys = ['OPENROUTER_API_KEY'];
    const optionalKeys = ['DEFAULT_MODEL_IMAGE_URL'];
    
    const apiKeysStatus = {
      required: {} as Record<string, boolean>,
      optional: {} as Record<string, boolean>
    };

    requiredKeys.forEach(key => {
      apiKeysStatus.required[key] = !!process.env[key];
    });

    optionalKeys.forEach(key => {
      apiKeysStatus.optional[key] = !!process.env[key];
    });

    const allRequiredPresent = Object.values(apiKeysStatus.required).every(Boolean);

    res.status(allRequiredPresent ? 200 : 503).json({
      status: allRequiredPresent ? "healthy" : "unhealthy",
      message: "AI Fashion Agent Health Check",
      apiKeys: apiKeysStatus,
      ready: allRequiredPresent
    });
  }
};