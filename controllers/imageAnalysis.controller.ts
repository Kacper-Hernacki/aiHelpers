// controllers/imageAnalysis.controller.ts
import { Request, Response } from "express";
import { openaiService } from "../services/openai/openai.service";
import { fileProcessorService } from "../services/file/fileProcessor.service";
import { multipleImageAnalysisService } from "../services/imageAnalysis/multipleImageAnalysis.service";
import fetch from "node-fetch";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

// Define the controller type to avoid reference issues
type ImageAnalysisController = {
  analyzeImage: (req: Request, res: Response) => void;
  analyzeMultipleImages: (req: Request, res: Response) => void;
};

// Export with explicit type annotation
export const imageAnalysisController: ImageAnalysisController = {
  /**
   * Analyze an image using OpenAI's API to extract text and get a description
   * Endpoint: POST /api/image/analyze-image
   */
  analyzeImage: (req: Request, res: Response) => {
    debug("Starting image analysis handler");
    
    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: "error",
        message: "OpenAI API key is not configured"
      });
    }
    
    // Use the file processor service to handle the upload
    fileProcessorService.processFileUpload(
      req,
      res,
      'image', // Field name to process
      (mimeType) => mimeType.startsWith('image/'), // Only accept image files
      async (fileData, fileBuffer, mimeType) => {
        try {
          // Now analyze the image using OpenAI
          debug('Analyzing image with OpenAI');
          
          try {
            // Use the CDN URL to fetch the image
            const imageResponse = await fetch(fileData.url);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
            }
            
            // Use arrayBuffer() instead of buffer() and convert to Buffer
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            
            // Analyze the image with OpenAI
            const analysisResult = await openaiService.analyzeImage(imageBuffer, mimeType);
            
            // Return success response with analysis and file URLs
            res.status(200).json({
              status: "success",
              message: "Image uploaded and analyzed successfully",
              data: {
                ...fileData,
                analysis: {
                  fullAnalysis: analysisResult.fullAnalysis,
                  extractedText: analysisResult.extractedText,
                  sourcePlatform: analysisResult.sourceIdentified,
                  imageDescription: analysisResult.imageDescription
                }
              }
            });
          } catch (openaiError: any) {
            debug('OpenAI API error:', openaiError);
            // Still return success for upload but with analysis error
            res.status(200).json({
              status: "partial_success",
              message: "Image uploaded successfully but analysis failed",
              data: {
                ...fileData,
                analysisError: openaiError.message
              }
            });
          }
        } catch (error: any) {
          debug('General error:', error);
          res.status(500).json({
            status: "error",
            message: `Error processing image: ${error.message}`
          });
        }
      },
      () => {
        // No file uploaded
        res.status(400).json({
          status: "error",
          message: "No image was uploaded with field name 'image'"
        });
      }
    );
  },
  
  /**
   * Analyze multiple images and consolidate the results
   * Endpoint: POST /api/image/analyze-multiple-images
   * Useful for analyzing screenshots of the same post across multiple images
   */
  analyzeMultipleImages: (req: Request, res: Response) => {
    debug("Starting multiple image analysis handler");
    
    // Use the new service to handle multiple image analysis
    multipleImageAnalysisService.processMultipleImages(req, res, 'images');
  }
};
