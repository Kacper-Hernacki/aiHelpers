// services/file/fileProcessor.service.ts
import { Request, Response } from "express";
import busboy from "busboy";
import { digitalOceanService } from "../storage/digitalOcean.service";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

export const fileProcessorService = {
  /**
   * Process a file upload request and handle the file
   * @param req - Express request object
   * @param res - Express response object
   * @param fieldName - Field name to look for in the form data
   * @param fileTypeValidation - Function to validate file type
   * @param onSuccess - Callback function for successful upload
   * @param onNoFile - Callback function when no file is provided
   */
  processFileUpload: (
    req: Request, 
    res: Response, 
    fieldName: string,
    fileTypeValidation: (mimeType: string) => boolean,
    onSuccess: (fileData: any, fileBuffer: Buffer, mimeType: string) => Promise<void>,
    onNoFile: () => void
  ) => {
    debug(`Starting file upload handler for field: ${fieldName}`);
    
    // Check if content type is correct
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({
        status: "error",
        message: "Content-Type must be multipart/form-data"
      });
    }
    
    // Setup busboy to process the uploaded file
    const bb = busboy({ headers: req.headers });
    let fileProcessed = false;
    
    // Handle file uploads
    bb.on('file', (fieldname, file, info) => {
      // Only process the specified field
      if (fieldname !== fieldName) {
        file.resume(); // Skip other fields
        return;
      }
      
      const { filename, mimeType } = info;
      debug(`Processing file: ${filename}`);
      
      // Validate file type if validation function is provided
      if (!fileTypeValidation(mimeType)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid file type. Only specific formats are accepted.`
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
          
          // Upload file to Digital Ocean Spaces
          const fileData = await digitalOceanService.uploadFile(fileBuffer, filename, mimeType);
          
          // Call success callback with file data
          await onSuccess(fileData, fileBuffer, mimeType);
          
        } catch (error: any) {
          debug('General error:', error);
          return res.status(500).json({
            status: "error",
            message: `Error processing file: ${error.message}`
          });
        }
      });
    });
    
    // Handle form completion
    bb.on('finish', () => {
      if (!fileProcessed) {
        onNoFile();
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
