// src/controllers/fileUpload.controller.ts
import { Request, Response } from "express";
import AWS from 'aws-sdk'; // Using AWS SDK v2 which is more compatible with DO Spaces
import { v4 as uuidv4 } from "uuid";
import path from "path";
import busboy from "busboy";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

// Digital Ocean Spaces configuration
const BUCKET_NAME = "aiadaptiv";
const REGION = "fra1";
const SPACES_ENDPOINT = `fra1.digitaloceanspaces.com`;

/**
 * File upload controller using AWS SDK v2 for better compatibility with Digital Ocean Spaces
 */
export const uploadFile = (req: Request, res: Response) => {
  debug("Starting file upload handler");
  
  // Check if content type is correct
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({
      success: false,
      message: "Content-Type must be multipart/form-data"
    });
  }
  
  // Configure AWS SDK v2 for Digital Ocean Spaces
  // This is a more reliable configuration that works with DO Spaces
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
    // Only process the 'file' field
    if (fieldname !== 'file') {
      file.resume(); // Skip other fields
      return;
    }
    
    const { filename, mimeType } = info;
    debug(`Processing file: ${filename}`);
    
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
          success: false,
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
        
        debug(`Uploading file: ${uniqueFilename}, size: ${fileSize} bytes`);
        
        // Create upload parameters using AWS SDK v2 format
        const params = {
          Bucket: BUCKET_NAME,
          Key: uniqueFilename,
          Body: fileBuffer,
          ContentType: contentType,
          ACL: 'public-read'
        };
        
        // Upload file using AWS SDK v2
        debug('Sending upload request with AWS SDK v2...');
        s3.putObject(params, (err, data) => {
          if (err) {
            debug('Upload error:', err);
            return res.status(500).json({
              success: false,
              message: `Upload error: ${err.message}`
            });
          }
          
          debug('Upload success, data:', data);
          
          // Create URLs for the uploaded file
          const spaces_url = `https://${BUCKET_NAME}.${SPACES_ENDPOINT}/${uniqueFilename}`;
          const cdn_url = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${uniqueFilename}`;
          
          // Return success response
          return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: {
              url: cdn_url,
              originUrl: spaces_url,
              filename: uniqueFilename,
              originalName: filename,
              size: fileSize,
              etag: data.ETag
            }
          });
        });
      } catch (error: any) {
        debug('General upload error:', error);
        return res.status(500).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
      }
    });
  });
  
  // Handle form completion
  bb.on('finish', () => {
    if (!fileProcessed) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded with field name 'file'"
      });
    }
  });
  
  // Handle errors
  bb.on('error', (err: Error) => {
    debug('Busboy error:', err);
    return res.status(500).json({
      success: false,
      message: `Error processing form data: ${err.message}`
    });
  });
  
  // Pipe request to busboy
  req.pipe(bb);
};

// Helper function to determine content type
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
  };
  return contentTypes[ext] || 'application/octet-stream';
}
