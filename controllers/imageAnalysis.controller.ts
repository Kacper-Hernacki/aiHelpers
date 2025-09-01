// controllers/imageAnalysis.controller.ts
import { Request, Response } from "express";
import { openaiService } from "../services/openai/openai.service";
import { fileProcessorService } from "../services/file/fileProcessor.service";
import { multipleImageAnalysisService } from "../services/imageAnalysis/multipleImageAnalysis.service";
import { digitalOceanService } from "../services/storage/digitalOcean.service";
import fetch from "node-fetch";
import { OpenAI } from "openai";
import busboy from "busboy";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

// Define the controller type to avoid reference issues
type ImageAnalysisController = {
  analyzeImage: (req: Request, res: Response) => void;
  analyzeMultipleImages: (req: Request, res: Response) => void;
  extractText: (req: Request, res: Response) => void;
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
    
    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: "error",
        message: "OpenAI API key is not configured"
      });
    }
    
    // Using the same approach as the fileUpload controller which is known to work in production
    const files: any[] = [];
    const imageBuffers: {buffer: Buffer, mimeType: string, originalName: string, url: string}[] = [];
    
    // Create basic parser - same setup as the working file upload endpoint
    const bb = require('busboy')({ headers: req.headers });
    
    // Setup response timeout as a fallback
    const responseTimeout = setTimeout(() => {
      debug('TIMEOUT: Sending response after 15 seconds');
      sendResponse();
    }, 15000);
    
    // Function to send consolidated response
    const sendResponse = async () => {
      clearTimeout(responseTimeout);
      
      try {
        if (imageBuffers.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "No valid images were uploaded"
          });
        }
        
        debug(`Processing ${imageBuffers.length} images for analysis`);
        
        // Analyze all images
        const analysisResults = [];
        let consolidatedText = "";
        let sourcePlatform = "N/A";
        
        // Process each image
        for (const imageData of imageBuffers) {
          try {
            const result = await openaiService.analyzeImage(imageData.buffer, imageData.mimeType);
            analysisResults.push({
              ...result,
              originalName: imageData.originalName,
              url: imageData.url
            });
            
            // Update consolidated info
            if (result.extractedText && result.extractedText !== "N/A") {
              consolidatedText += result.extractedText + "\n\n";
            }
            
            // Update source platform (take the first non-N/A value)
            if (sourcePlatform === "N/A" && result.sourceIdentified && result.sourceIdentified !== "N/A") {
              sourcePlatform = result.sourceIdentified;
            }
          } catch (analysisError: any) {
            debug(`Error analyzing image ${imageData.originalName}:`, analysisError);
          }
        }
        
        // Deduplicate text lines
        const textLines = consolidatedText.split('\n')
          .filter(line => line.trim() !== '');
        
        // Remove duplicated lines using Set
        const uniqueLines = [...new Set(textLines)];
        const deduplicatedText = uniqueLines.join('\n');
        
        // Return results
        return res.status(200).json({
          status: "success",
          message: `${imageBuffers.length} images analyzed successfully`,
          data: {
            files,
            analysis: {
              individualResults: analysisResults,
              consolidated: {
                platform: sourcePlatform,
                extractedText: deduplicatedText,
              }
            }
          }
        });
      } catch (error: any) {
        debug('Error during analysis:', error);
        return res.status(500).json({
          status: "error",
          message: `Error analyzing images: ${error.message}`,
          files
        });
      }
    };
    
    // Process each file - accept BOTH 'files' and 'images' field names
    bb.on('file', (field: string, file: any, info: any) => {
      // Accept any field name - don't be picky in production
      const { filename, mimeType } = info;
      
      // Validate mime type
      if (!mimeType.startsWith('image/')) {
        debug(`Skipping non-image file: ${filename} (${mimeType})`);
        file.resume();
        return;
      }
      
      debug(`Processing image: ${filename}`);
      
      // Collect file data
      const chunks: Buffer[] = [];
      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      file.on('close', async () => {
        try {
          if (chunks.length === 0) return;
          
          const buffer = Buffer.concat(chunks);
          
          // Get the DO Spaces service from the global scope
          const { digitalOceanService } = require('../services/storage/digitalOcean.service');
          
          // Upload to storage
          const result = await digitalOceanService.uploadFile(buffer, filename, mimeType);
          files.push(result);
          
          // Store for analysis
          imageBuffers.push({
            buffer,
            mimeType,
            originalName: filename,
            url: result.url
          });
          
        } catch (err) {
          debug('Upload error:', err);
        }
      });
    });
    
    // Ensure we send a response when done
    bb.on('finish', () => {
      debug('Parsing complete');
      sendResponse();
    });
    
    // Handle errors
    bb.on('error', (err: Error) => {
      debug('Busboy error:', err);
      clearTimeout(responseTimeout);
      return res.status(500).json({
        status: "error",
        message: `Error processing form data: ${err.message}`
      });
    });
    
    // Start parsing
    req.pipe(bb);
  },

  /**
   * Extract text from an image using OpenAI's Vision API
   * Endpoint: POST /api/image/extract-text
   */
  extractText: (req: Request, res: Response) => {
    debug("Starting text extraction handler");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: "error",
        message: "OpenAI API key is not configured"
      });
    }
    
    const files: any[] = [];
    const imageBuffers: {buffer: Buffer, mimeType: string, originalName: string, url: string}[] = [];
    
    const bb = busboy({ headers: req.headers });
    
    const responseTimeout = setTimeout(() => {
      debug('TIMEOUT: Sending response after 15 seconds');
      sendResponse();
    }, 15000);
    
    const sendResponse = async () => {
      clearTimeout(responseTimeout);
      
      try {
        if (imageBuffers.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "No valid images were uploaded"
          });
        }
        
        debug(`Processing ${imageBuffers.length} images for text extraction`);
        
        const imageData = imageBuffers[0];
        try {
          const base64Image = imageData.buffer.toString('base64');
          
          const response = await openaiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Extract ALL visible text from this image. Include every word, phrase, letter, number, symbol, and character you can see. Be extremely thorough and comprehensive. Include text from buttons, labels, captions, titles, body text, watermarks, timestamps, usernames, hashtags, and any other visible text elements. If no text is visible, respond with 'N/A'."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract all visible text from this image:" },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${imageData.mimeType};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1500,
          });
          
          const extractedText = response.choices[0]?.message?.content || "N/A";
          
          return res.status(200).json({
            status: "success",
            message: "Text extracted from image successfully",
            data: {
              files,
              extraction: {
                extractedText,
                originalName: imageData.originalName,
                url: imageData.url
              }
            }
          });
        } catch (openaiError: any) {
          debug('OpenAI API error:', openaiError);
          return res.status(500).json({
            status: "error",
            message: `Text extraction failed: ${openaiError.message}`,
            files
          });
        }
      } catch (error: any) {
        debug('Error during text extraction:', error);
        return res.status(500).json({
          status: "error",
          message: `Error extracting text: ${error.message}`,
          files
        });
      }
    };
    
    bb.on('file', (field: string, file: any, info: any) => {
      const { filename, mimeType } = info;
      
      if (!mimeType.startsWith('image/')) {
        debug(`Skipping non-image file: ${filename} (${mimeType})`);
        file.resume();
        return;
      }
      
      debug(`Processing image: ${filename}`);
      
      const chunks: Buffer[] = [];
      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      file.on('close', async () => {
        try {
          if (chunks.length === 0) return;
          
          const buffer = Buffer.concat(chunks);
          
          const result = await digitalOceanService.uploadFile(buffer, filename, mimeType);
          files.push(result);
          
          imageBuffers.push({
            buffer,
            mimeType,
            originalName: filename,
            url: result.url
          });
          
        } catch (err) {
          debug('Upload error:', err);
        }
      });
    });
    
    bb.on('finish', () => {
      debug('Parsing complete');
      sendResponse();
    });
    
    bb.on('error', (err: Error) => {
      debug('Busboy error:', err);
      clearTimeout(responseTimeout);
      return res.status(500).json({
        status: "error",
        message: `Error processing form data: ${err.message}`
      });
    });
    
    req.pipe(bb);
  }
};
