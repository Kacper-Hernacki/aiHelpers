// controllers/imageAnalysis.controller.ts
import { Request, Response } from "express";
import { openaiService } from "../services/openai/openai.service";
import AWS from 'aws-sdk'; // Using AWS SDK v2 which is more compatible with DO Spaces
import busboy from "busboy";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

// Digital Ocean Spaces configuration
const BUCKET_NAME = "aiadaptiv";
const REGION = "fra1";
const SPACES_ENDPOINT = `fra1.digitaloceanspaces.com`;

// Define the controller type to avoid reference issues
type ImageAnalysisController = {
  analyzeImage: (req: Request, res: Response) => void;
};

// Export with explicit type annotation
export const imageAnalysisController: ImageAnalysisController = {
  /**
   * Analyze an image using OpenAI's API to extract text and get a description
   * Endpoint: POST /api/image/analyze-image
   */
  analyzeImage: (req: Request, res: Response) => {
    debug("Starting image analysis handler");
    
    // Check if content type is correct
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({
        status: "error",
        message: "Content-Type must be multipart/form-data"
      });
    }
    
    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: "error",
        message: "OpenAI API key is not configured"
      });
    }
    
    // Configure AWS SDK v2 for Digital Ocean Spaces
    const spacesEndpoint = new AWS.Endpoint(SPACES_ENDPOINT);
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      region: REGION,
      signatureVersion: 'v4'
    });
    
    // Setup busboy to process the uploaded file
    const bb = busboy({ headers: req.headers });
    let fileProcessed = false;
    
    // Handle file uploads
    bb.on('file', (fieldname, file, info) => {
      // Only process the 'image' field
      if (fieldname !== 'image') {
        file.resume(); // Skip other fields
        return;
      }
      
      const { filename, mimeType } = info;
      debug(`Processing image: ${filename}`);
      
      // Check if the file is an image
      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({
          status: "error",
          message: "Uploaded file must be an image"
        });
      }
      
      fileProcessed = true;
      const chunks: Buffer[] = [];
      let fileSize = 0;
      
      // Collect file data
      file.on('data', (chunk) => {
        chunks.push(chunk);
        fileSize += chunk.length;
      });
      
      // When file is fully received
      file.on('close', async () => {
        if (fileSize === 0) {
          return res.status(400).json({
            status: "error",
            message: "Empty file received"
          });
        }
        
        try {
          // Create buffer from the file chunks
          const fileBuffer = Buffer.concat(chunks);
          
          // Generate unique filename
          const fileExt = path.extname(filename);
          const uniqueFilename = `${Date.now()}-${uuidv4()}${fileExt}`;
          
          // Determine content type
          const contentType = mimeType || getContentType(filename);
          
          debug(`Uploading image to DO Spaces: ${uniqueFilename}, size: ${fileSize} bytes`);
          
          // Create upload parameters using AWS SDK v2 format
          const params = {
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
            Body: fileBuffer,
            ContentType: contentType,
            ACL: 'public-read'
          };
          
          // Upload file to Digital Ocean Spaces
          s3.putObject(params, async (err, data) => {
            if (err) {
              debug('Upload error:', err);
              return res.status(500).json({
                status: "error",
                message: `Upload error: ${err.message}`
              });
            }
            
            debug('Upload success, data:', data);
            
            // Create URLs for the uploaded file
            const spaces_url = `https://${BUCKET_NAME}.${SPACES_ENDPOINT}/${uniqueFilename}`;
            const cdn_url = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${uniqueFilename}`;
            
            try {
              // Now analyze the image using OpenAI
              debug('Fetching image for OpenAI analysis');
              
              // Use the CDN URL to fetch the image
              const imageResponse = await fetch(cdn_url);
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
              }
              
              // Use arrayBuffer() instead of buffer() and convert to Buffer
              const arrayBuffer = await imageResponse.arrayBuffer();
              const imageBuffer = Buffer.from(arrayBuffer);
              
              // Analyze the image with OpenAI
              const analysisResult = await openaiService.analyzeImage(imageBuffer, contentType);
              
              // Return success response with analysis and file URLs
              return res.status(200).json({
                status: "success",
                message: "Image uploaded and analyzed successfully",
                data: {
                  url: cdn_url,
                  originUrl: spaces_url,
                  filename: uniqueFilename,
                  originalName: filename,
                  size: fileSize,
                  etag: data.ETag,
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
              return res.status(200).json({
                status: "partial_success",
                message: "Image uploaded successfully but analysis failed",
                data: {
                  url: cdn_url,
                  originUrl: spaces_url,
                  filename: uniqueFilename,
                  originalName: filename,
                  size: fileSize,
                  etag: data.ETag,
                  analysisError: openaiError.message
                }
              });
            }
          });
        } catch (error: any) {
          debug('General error:', error);
          return res.status(500).json({
            status: "error",
            message: `Error processing image: ${error.message}`
          });
        }
      });
    });
    
    // Handle form completion
    bb.on('finish', () => {
      if (!fileProcessed) {
        return res.status(400).json({
          status: "error",
          message: "No image was uploaded with field name 'image'"
        });
      }
    });
    
    // Handle errors
    bb.on('error', (err: Error) => {
      debug('Busboy error:', err);
      return res.status(500).json({
        status: "error",
        message: `Error processing form data: ${err.message}`
      });
    });
    
    // Pipe request to busboy
    req.pipe(bb);
  }
};

// Helper function to determine content type
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.svg': 'image/svg+xml'
  };
  return contentTypes[ext] || 'application/octet-stream';
}
