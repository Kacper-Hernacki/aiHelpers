// controllers/fileUpload.controller.ts
import { Request, Response } from "express";
import { fileProcessorService } from "../services/file/fileProcessor.service";
import { digitalOceanService } from "../services/storage/digitalOcean.service";
import busboy from "busboy";


// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

/**
 * File upload controller using the file processor service
 */
export const uploadFile = (req: Request, res: Response) => {
  // Use the file processor service to handle the upload
  fileProcessorService.processFileUpload(
    req,
    res,
    'file', // Field name to process
    (mimeType) => true, // Accept all file types
    async (fileData, fileBuffer, mimeType) => {
      // On successful upload, return the file data
      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data: fileData
      });
    },
    () => {
      // No file uploaded
      res.status(400).json({
        success: false,
        message: "No file was uploaded with field name 'file'"
      });
    }
  );
};

/**
 * Get file information from Digital Ocean Spaces
 * Endpoint: GET /api/file/info/:filename
 */
export const getFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: "Filename is required"
      });
    }
    
    debug(`Getting file info for: ${filename}`);
    
    // Use the Digital Ocean service to get file info
    const fileInfo = await digitalOceanService.getFileInfo(filename);
    
    // Return file information
    return res.status(200).json({
      success: true,
      message: "File info retrieved successfully",
      data: fileInfo
    });
  } catch (error: any) {
    debug('File info error:', error);
    return res.status(500).json({
      success: false,
      message: `Error retrieving file info: ${error.message}`
    });
  }
};

/**
 * Download a file directly from Digital Ocean Spaces
 * Endpoint: GET /api/file/download/:filename
 */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: "Filename is required"
      });
    }
    
    debug(`Downloading file: ${filename}`);
    
    try {
      // Get file info first to determine content type and size
      const fileInfo: any = await digitalOceanService.getFileInfo(filename);
      
      // Now get the file data
      const fileData: any = await digitalOceanService.getFile(filename);
      
      // Set appropriate headers
      res.setHeader('Content-Length', fileInfo.size?.toString() || '0');
      res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the file data
      return res.send(fileData.Body);
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return res.status(404).json({
          success: false,
          message: `File not found: ${filename}`
        });
      }
      throw error;
    }
  } catch (error: any) {
    debug('Unexpected error in downloadFile:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
};

/**
 * DEAD SIMPLE multiple file upload endpoint
 */
export const uploadMultipleFiles = (req: Request, res: Response) => {
  const files: any[] = [];
  
  // Create basic parser
  const bb = busboy({ headers: req.headers });
  
  // Setup response timeout as a fallback
  const responseTimeout = setTimeout(() => {
    debug('TIMEOUT: Sending response after 3 seconds');
    sendResponse();
  }, 3000);
  
  // Function to send response
  const sendResponse = () => {
    clearTimeout(responseTimeout);
    debug(`Sending response with ${files.length} files`);
    res.json({ success: true, files });
  };
  
  // Process files
  bb.on('file', (field, file, info) => {
    if (field !== 'files') {
      file.resume();
      return;
    }
    
    const { filename, mimeType } = info;
    debug('File detected:', filename);
    
    const chunks: any[] = [];
    file.on('data', (chunk) => chunks.push(chunk));
    
    file.on('close', async () => {
      try {
        if (chunks.length === 0) return;
        
        const buffer = Buffer.concat(chunks);
        const result = await digitalOceanService.uploadFile(buffer, filename, mimeType);
        files.push(result);
        
        // No additional check needed here
      } catch (err) {
        debug('Upload error:', err);
      }
    });
  });
  
  // This is critical - ensures we send a response when done
  bb.on('finish', () => {
    debug('Parsing complete, sending response');
    sendResponse();
  });
  
  // Start parsing
  req.pipe(bb);
}
