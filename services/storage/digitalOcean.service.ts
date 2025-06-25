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
    debug('Creating S3 client with endpoint:', SPACES_ENDPOINT);
    const spacesEndpoint = new AWS.Endpoint(SPACES_ENDPOINT);
    return new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      region: REGION,
      signatureVersion: 'v4',
      httpOptions: {
        timeout: 20000 // 20 seconds timeout
      }
    });
  },

  /**
   * Upload a file to Digital Ocean Spaces
   * @param fileBuffer - Buffer of the file to upload
   * @param filename - Original name of the file
   * @param mimeType - Optional MIME type, will be determined from filename if not provided
   * @returns Promise with URLs and file info
   */
  uploadFile(fileBuffer: Buffer, filename: string, mimeType?: string) {
    const s3 = this.getS3Client();
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(filename)}`;
    
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
            Body: fileBuffer,
            ACL: 'public-read',
            ContentType: mimeType || this.getContentType(filename)
        };
        
        debug('Attempting to upload to Digital Ocean with params:', {
          Bucket: params.Bucket,
          Key: params.Key,
          ACL: params.ACL,
          ContentType: params.ContentType,
          ContentLength: fileBuffer.length,
        });

        s3.putObject(params, (err, data) => {
            if (err) {
                debug('Upload to Digital Ocean failed:', err);
                reject(err);
                return;
            }
            
            const cdn_url = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${uniqueFilename}`;
            debug('File uploaded successfully. URL:', cdn_url);
            
            resolve({
                url: cdn_url,
                filename: uniqueFilename,
                ...data
            });
        });
    });
  },

  /**
   * Get file information from Digital Ocean Spaces
   * @param filename - Name of the file to retrieve info for
   * @returns Promise with file information
   */
  getFileInfo(filename: string) {
    const s3 = this.getS3Client();
    const params = {
      Bucket: BUCKET_NAME,
      Key: filename
    };

    return new Promise((resolve, reject) => {
      s3.headObject(params, (err, data) => {
        if (err) {
          if (err.code === 'NotFound') {
            resolve(null); // File not found
          } else {
            reject(err);
          }
        } else {
          const cdn_url = `https://${BUCKET_NAME}.${REGION}.cdn.digitaloceanspaces.com/${filename}`;
          resolve({
            filename: filename,
            size: data.ContentLength,
            lastModified: data.LastModified,
            contentType: data.ContentType,
            etag: data.ETag,
            url: cdn_url
          });
        }
      });
    });
  },

  /**
   * Get a file from Digital Ocean Spaces
   * @param filename - Name of the file to download
   * @returns Promise with file data
   */
  getFile(filename: string) {
    const s3 = this.getS3Client();
    const params = {
      Bucket: BUCKET_NAME,
      Key: filename
    };

    return new Promise((resolve, reject) => {
      s3.getObject(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Body);
        }
      });
    });
  },
  
  /**
   * Determine content type from filename
   * @param filename - Name of the file
   * @returns MIME type string
   */
  getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.pdf':
        return 'application/pdf';
      case '.txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
};
