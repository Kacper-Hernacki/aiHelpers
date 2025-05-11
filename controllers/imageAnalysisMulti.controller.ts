// controllers/imageAnalysisMulti.controller.ts
import { Request, Response } from "express";
import { openaiService } from "../services/openai/openai.service";
import { digitalOceanService } from "../services/storage/digitalOcean.service";
import busboy from "busboy";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), "|", ...args);
};

/**
 * Controller for analyzing multiple images
 * Mimics the pattern from the working file upload controller
 */
export const analyzeMultipleImages = (req: Request, res: Response) => {
  debug("Starting multiple image analysis handler");

  // Check if OpenAI API key exists
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      status: "error",
      message: "OpenAI API key is not configured"
    });
  }

  // Variables to store our results
  const files: any[] = [];
  const imageBuffers: {buffer: Buffer, mimeType: string, originalName: string, url: string}[] = [];

  // Create basic parser - EXACT same approach as the working multiple file upload
  // Store request info for diagnostics
  const diagnostics = {
    contentType: req.headers['content-type'],
    requestMethod: req.method,
    receivedFields: Array<{fieldname: string, valueLength: number}>(),
    receivedFileFields: Array<{fieldName: string, fileName: string, mimeType: string}>(),
    fileBuffersLength: 0,
    hasTimeout: false
  };
  
  const bb = busboy({ headers: req.headers });

  // Setup response timeout as a fallback
  const responseTimeout = setTimeout(() => {
    debug('TIMEOUT: Sending response after 15 seconds');
    diagnostics.hasTimeout = true;
    processAndSendResponse();
  }, 15000);

  // Function to analyze images and send response
  const processAndSendResponse = async () => {
    clearTimeout(responseTimeout);

    try {
      // Track how many buffers we have for diagnostics
      diagnostics.fileBuffersLength = imageBuffers.length;
      
      if (imageBuffers.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid images were uploaded",
          diagnostics: {
            ...diagnostics,
            requestHeaders: {
              contentType: req.headers['content-type'],
              contentLength: req.headers['content-length'],
              host: req.headers.host,
              userAgent: req.headers['user-agent']
            },
            additionalInfo: "Please ensure you're uploading image files with a field name that's detected by the server"
          }
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
          files: files,
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
        files: files
      });
    }
  };

  // Process each file - ACCEPT ANY FIELD NAME (this is key for compatibility)
  bb.on('file', (field: string, file: any, info: any) => {
    // Track received file fields for diagnostics
    diagnostics.receivedFileFields.push({
      fieldName: field,
      fileName: info.filename,
      mimeType: info.mimeType
    });
    const { filename, mimeType } = info;

    // Validate mime type
    if (!mimeType.startsWith('image/')) {
      debug(`Skipping non-image file: ${filename} (${mimeType})`);
      file.resume();
      return;
    }

    debug(`Processing image: ${filename}, field: ${field}`);

    // Collect file data
    const chunks: Buffer[] = [];
    file.on('data', (chunk: Buffer) => chunks.push(chunk));

    file.on('close', async () => {
      try {
        if (chunks.length === 0) return;

        const buffer = Buffer.concat(chunks);
        const result = await digitalOceanService.uploadFile(buffer, filename, mimeType) as any;
        files.push(result);

        // Store for analysis
        imageBuffers.push({
          buffer,
          mimeType,
          originalName: filename,
          url: result.url
        });

      } catch (err: any) {
        debug('Upload error:', err);
      }
    });
  });

  // Track any form fields too (not files)
  bb.on('field', (fieldname: string, value: string) => {
    diagnostics.receivedFields.push({ fieldname, valueLength: value.length });
  });
  
  // This is CRITICAL - ensures we send a response when done
  bb.on('finish', () => {
    debug('Form parsing complete, starting analysis');
    processAndSendResponse();
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
};
