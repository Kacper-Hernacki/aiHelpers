// services/storage/digitalOcean.service.ts
import AWS from 'aws-sdk';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

// Digital Ocean Spaces configuration
const BUCKET_NAME = "aiadaptiv";
const REGION = "fra1";
const SPACES_ENDPOINT = `fra1.digitaloceanspaces.com`;

export const digitalOceanService = {
  /**
   * Initialize and return an S3 client configured for Digital Ocean Spaces
   */
  getS3Client: () => {
    const spacesEndpoint = new AWS.Endpoint(SPACES_ENDPOINT);
    return new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      region: REGION,
      signatureVersion: 'v4'
    });
  },

  /**
   * Upload a file to Digital Ocean Spaces
   * @param fileBuffer - The file buffer to upload
   * @param filename - Original filename
   * @param mimeType - MIME type of the file
   * @returns Promise with upload result data
   */
  uploadFile: async (fileBuffer: Buffer, filename: string, mimeType: string) => {
    try {
      // Generate unique filename
      const fileExt = path.extname(filename);
      const uniqueFilename = `${Date.now()}-${uuidv4()}${fileExt}`;
      
      // Determine content type
      const contentType = mimeType || digitalOceanService.getContentType(filename);
      
      debug(`Uploading file to DO Spaces: ${uniqueFilename}, size: ${fileBuffer.length} bytes`);
      
      // Get S3 client
      const s3 = digitalOceanService.getS3Client();
      
      // Create upload parameters
      const params = {
        Bucket: BUCKET_NAME,
        Key: uniqueFilename,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read'
      };
      
      // Upload file
      return new Promise((resolve, reject) => {
        s3.putObject(params, (err, data) => {
          if (err) {
            debug('Upload error:', err);
            reject(err);
            return;
          }
          
          debug('Upload success, data:', data);
          
          // Create URLs for the uploaded file
          const spaces_url = `https://${BUCKET_NAME}.${SPACES_ENDPOINT}/${uniqueFilename}`;
          const cdn_url = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${uniqueFilename}`;
          
          resolve({
            url: cdn_url,
            originUrl: spaces_url,
            filename: uniqueFilename,
            originalName: filename,
            size: fileBuffer.length,
            etag: data.ETag
          });
        });
      });
    } catch (error: any) {
      debug('General upload error:', error);
      throw new Error(`Upload error: ${error.message}`);
    }
  },

  /**
   * Get file information from Digital Ocean Spaces
   * @param filename - Name of the file to retrieve info for
   * @returns Promise with file information
   */
  getFileInfo: async (filename: string) => {
    try {
      const s3 = digitalOceanService.getS3Client();
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: filename
      };
      
      return new Promise((resolve, reject) => {
        s3.headObject(params, (err, data) => {
          if (err) {
            debug('File info error:', err);
            reject(err);
            return;
          }
          
          const spaces_url = `https://${BUCKET_NAME}.${SPACES_ENDPOINT}/${filename}`;
          const cdn_url = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${filename}`;
          
          resolve({
            url: cdn_url,
            originUrl: spaces_url,
            filename: filename,
            contentType: data.ContentType,
            size: data.ContentLength,
            lastModified: data.LastModified,
            etag: data.ETag
          });
        });
      });
    } catch (error: any) {
      debug('File info error:', error);
      throw new Error(`File info error: ${error.message}`);
    }
  },

  /**
   * Get a file from Digital Ocean Spaces
   * @param filename - Name of the file to download
   * @returns Promise with file data
   */
  getFile: async (filename: string) => {
    try {
      const s3 = digitalOceanService.getS3Client();
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: filename
      };
      
      return new Promise((resolve, reject) => {
        s3.getObject(params, (err, data) => {
          if (err) {
            debug('File download error:', err);
            reject(err);
            return;
          }
          
          resolve(data);
        });
      });
    } catch (error: any) {
      debug('File download error:', error);
      throw new Error(`File download error: ${error.message}`);
    }
  },

  /**
   * Determine content type from filename
   * @param filename - Name of the file
   * @returns MIME type string
   */
  getContentType: (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
};
