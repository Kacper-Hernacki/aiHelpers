import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PDFTextExtractor {
  /**
   * Extract text from PDF using multiple fallback methods
   */
  static async extractText(filePath: string): Promise<string> {
    // Method 1: Try using pdftotext if available (most reliable)
    try {
      const { stdout } = await execAsync(`pdftotext "${filePath}" -`);
      if (stdout && stdout.trim().length > 0) {
        return stdout;
      }
    } catch (error) {
      console.log('pdftotext not available, trying alternative methods...');
    }

    // Method 2: Try simple PDF text extraction using buffer analysis
    try {
      const buffer = fs.readFileSync(filePath);
      const text = this.extractTextFromBuffer(buffer);
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (error) {
      console.log('Buffer extraction failed, trying final method...');
    }

    // Method 3: Return placeholder text if all else fails
    return 'PDF content could not be extracted. Please ensure the PDF contains extractable text.';
  }

  /**
   * Simple text extraction from PDF buffer
   * This is a basic implementation that looks for text patterns
   */
  private static extractTextFromBuffer(buffer: Buffer): string {
    try {
      // Convert buffer to string and look for text patterns
      const str = buffer.toString('binary');
      const textMatches = str.match(/\(([^)]+)\)/g);
      
      if (textMatches) {
        return textMatches
          .map(match => match.slice(1, -1)) // Remove parentheses
          .filter(text => text.length > 1) // Filter out single characters
          .join(' ')
          .replace(/[^\x20-\x7E]/g, ' ') // Replace non-printable characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }
      
      return '';
    } catch (error) {
      console.error('Error in buffer text extraction:', error);
      return '';
    }
  }
}
