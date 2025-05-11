// services/imageAnalysis/multipleImageAnalysis.service.ts
import { openaiService } from "../openai/openai.service";
import { digitalOceanService } from "../storage/digitalOcean.service";
import busboy from "busboy";
import { Request, Response } from "express";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

export const multipleImageAnalysisService = {
  /**
   * Process multiple images from a multipart/form-data request
   * Uses OpenAI to analyze each image and consolidates the results
   * 
   * @param req Express Request object
   * @param res Express Response object
   * @param fieldName Name of the form field containing the images
   * @param timeoutMs Timeout in milliseconds (defaults to 15000)
   */
  processMultipleImages: (
    req: Request, 
    res: Response, 
    fieldName: string = 'images',
    timeoutMs: number = 15000
  ) => {
    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: "error",
        message: "OpenAI API key is not configured"
      });
    }
    
    // Constants
    const fileResults: any[] = [];
    const imageBuffers: {buffer: Buffer, mimeType: string, originalName: string, url: string}[] = [];
    
    try {
      // Setup busboy for file parsing
      const bb = busboy({ headers: req.headers });
      
      // Setup response timeout as a fallback
      const responseTimeout = setTimeout(() => {
        debug(`TIMEOUT: Processing taking too long, sending response after ${timeoutMs/1000} seconds`);
        sendResponse();
      }, timeoutMs);
      
      // Function to send consolidated response
      const sendResponse = async () => {
        clearTimeout(responseTimeout);
        
        try {
          if (imageBuffers.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `No valid images were uploaded with field name '${fieldName}' or 'files'`
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
              files: fileResults,
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
            files: fileResults
          });
        }
      };
      
      // Process each file
      bb.on('file', (field: string, file: any, info: any) => {
        // Check if field matches the specified field name OR 'files' (for compatibility with existing endpoints)
        if (field !== fieldName && field !== 'files') {
          debug(`Skipping field: ${field}, expected ${fieldName} or 'files'`);
          file.resume();
          return;
        }
        
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
            
            // Upload to storage
            const result = await digitalOceanService.uploadFile(buffer, filename, mimeType) as any;
            fileResults.push(result);
            
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
      
      // When form parsing is complete, analyze all images
      bb.on('finish', () => {
        debug('Form parsing complete, starting analysis');
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
      
      // Start processing
      req.pipe(bb);
      
    } catch (error: any) {
      debug('Unexpected error in processMultipleImages:', error);
      return res.status(500).json({
        status: "error",
        message: `Server error: ${error.message}`
      });
    }
  }
};
