// services/template/socialCardTemplate.service.ts
import { createCanvas, loadImage, Canvas, Image, registerFont } from 'canvas';
import axios from 'axios';
import { digitalOceanService } from '../storage/digitalOcean.service.js';
import path from 'path';
import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), "|", ...args);
};

// Register Poppins fonts
const fontDir = path.join(process.cwd(), 'assets', 'fonts', 'Poppins Font');

const fontsToRegister = {
  '100': 'Poppins-Thin.ttf',
  '200': 'Poppins-ExtraLight.ttf',
  '300': 'Poppins-Light.ttf',
  '400': 'Poppins-Regular.ttf',
  '500': 'Poppins-Medium.ttf',
  '600': 'Poppins-SemiBold.ttf',
  '700': 'Poppins-Bold.ttf',
  'bold': 'Poppins-Bold.ttf', // Alias for convenience, as 'bold' is used in the code
  '800': 'Poppins-ExtraBold.ttf',
  '900': 'Poppins-Black.ttf',
};

Object.entries(fontsToRegister).forEach(([weight, file]) => {
  const fontPath = path.join(fontDir, file);
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Poppins', weight });
    debug(`Registered Poppins font: ${file} with weight ${weight}`);
  } else {
    debug(`Font not found at path: ${fontPath}`);
  }
});

interface SquareCardParams {
  imageUrl: string;
  title: string;
  subtitle: string;
}

export const socialCardTemplateService = {
  /**
   * Create a social media card template using Canvas
   * @param imageUrl - URL of the image from Replicate
   * @param title - Title of the article
   * @returns Object with URLs for the created template
   */
  createSocialCard: async (imageUrl: string, title: string): Promise<any> => {
    try {
      debug(`Creating social card with image: ${imageUrl}`);
      debug(`Title: ${title}`);

      const scaleFactor = 2;
      const baseWidth = 1200;
      const baseHeight = 675;
      const width = baseWidth * scaleFactor;
      const height = baseHeight * scaleFactor;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Set high-quality rendering options
      ctx.quality = 'best';
      ctx.patternQuality = 'best';
      ctx.antialias = 'subpixel';
      ctx.textDrawingMode = 'path';

      // Create a clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Scale all drawing operations
      ctx.scale(scaleFactor, scaleFactor);

      // --- Background Decorative Elements ---
      const bgShape1 = await loadImage(path.join(process.cwd(), 'assets', 'bg', '1.png'));
      const bgShape2 = await loadImage(path.join(process.cwd(), 'assets', 'bg', '2.png'));
      const bgShape3 = await loadImage(path.join(process.cwd(), 'assets', 'bg', '3.png'));

      // Draw shapes at specified locations to be decorative but not overwhelming
      const bgScale = 8;
      ctx.globalAlpha = 0.8; // Increased alpha for better visibility
      ctx.drawImage(bgShape1, 40, 40, bgShape1.width / bgScale, bgShape1.height / bgScale); // Upper left, moved into view
      ctx.drawImage(bgShape2, baseWidth - 450, baseHeight / 2 - 200, bgShape2.width / bgScale, bgShape2.height / bgScale); // Middle-right
      ctx.drawImage(bgShape3, 40, baseHeight - 200, bgShape3.width / bgScale, bgShape3.height / bgScale); // Lower left, moved into view
      // Add a larger rectangle in the center text area
      ctx.drawImage(bgShape1, 250, 350, bgShape1.width / (bgScale / 2), bgShape1.height / (bgScale / 2));
      ctx.globalAlpha = 1.0;

      // --- Text Content ---
      const wrapText = (text: string, maxWidth: number, font: string): string[] => {
        ctx.font = font;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && i > 0) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        return lines;
      };

      const textX = 80;
      const textMaxWidth = 600; // More space for text

      // Title
      ctx.fillStyle = '#148ae0'; // Blue color
      ctx.font = '900 52px "Poppins"'; // Extra-bold
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const titleLineHeight = 65;
      debug('Wrapping title text...');
      const wrappedTitle = wrapText(title, textMaxWidth, ctx.font);
      debug(`Title text wrapped into ${wrappedTitle.length} lines.`);
      let currentY = 100;
      debug('Drawing title text lines...');
      wrappedTitle.forEach((line) => {
        ctx.fillText(line, textX, currentY);
        currentY += titleLineHeight;
      });
      debug('Title text drawn.');

      // Subtitle
      const subtitle = 'Discover the future of AI-driven content creation and design.';
      ctx.font = 'bold 28px "Poppins"'; // Bold weight
      ctx.fillStyle = '#05b4d5'; // Cyan/turquoise color
      const subtitleLineHeight = 40;
      currentY += 20;
      debug('Wrapping subtitle text...');
      const wrappedSubtitle = wrapText(subtitle, textMaxWidth, ctx.font);
      debug(`Subtitle text wrapped into ${wrappedSubtitle.length} lines.`);
      debug('Drawing subtitle text lines...');
      wrappedSubtitle.forEach((line) => {
        ctx.fillText(line, textX, currentY);
        currentY += subtitleLineHeight;
      });

      // Load the AI-generated image
      let image: Image;
      try {
        debug(`Fetching image with axios from: ${imageUrl}`);
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          timeout: 15000, // 15 second timeout
        });
        debug(`axios request successful. Status: ${imageResponse.status}.`);
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        debug(`Buffer created, size: ${imageBuffer.length}. Loading into canvas.`);
        image = await loadImage(imageBuffer);
        debug('Image loaded into canvas successfully.');
      } catch (axiosError: any) {
        debug('Error fetching image with axios:', axiosError.message);
        if (axiosError.response) {
          debug('Axios response error:', axiosError.response.status, axiosError.response.data.toString());
        }
        // Re-throw the error to be caught by the main try-catch block
        throw new Error(`Failed to download image via axios: ${axiosError.message}`);
      }
      debug('Starting trapezoid clipping...');
      const trapezoid = {
        top_left_x: 850, // Moved right for narrower image
        top_right_x: baseWidth,
        bottom_right_x: baseWidth,
        bottom_left_x: 700, // Moved right for narrower image
      };
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(trapezoid.top_left_x, 0);
      ctx.lineTo(trapezoid.top_right_x, 0);
      ctx.lineTo(trapezoid.bottom_right_x, baseHeight);
      ctx.lineTo(trapezoid.bottom_left_x, baseHeight);
      ctx.closePath();
      ctx.clip();
      debug('Trapezoid clipping complete.');

      // Logic to scale and center the image to fill the trapezoid
      debug('Calculating image scaling for trapezoid...');
      const trapezoidBoundingBox = {
        x: trapezoid.bottom_left_x,
        y: 0,
        width: baseWidth - trapezoid.bottom_left_x,
        height: baseHeight,
      };

      const scaleX = trapezoidBoundingBox.width / image.width;
      const scaleY = trapezoidBoundingBox.height / image.height;
      const scale = Math.max(scaleX, scaleY);

      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const drawX = trapezoidBoundingBox.x + (trapezoidBoundingBox.width - drawWidth) / 2;
      const drawY = trapezoidBoundingBox.y + (trapezoidBoundingBox.height - drawHeight) / 2;
      debug('Image scaling calculated.');

      debug('Drawing main image into clipped trapezoid...');
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
      debug('Main image drawn.');

      // --- Logo ---
      try {
        debug('Loading logo...');
        const logoPath = path.join(process.cwd(), 'assets', 'aiadaptiv-text-logo.png');
        const logo = await loadImage(logoPath);
        debug('Logo loaded.');
        const logoAspectRatio = logo.width / logo.height;
        const logoHeight = 45;
        const logoWidth = logoHeight * logoAspectRatio;
        const logoX = 80;
        const logoY = baseHeight - logoHeight - 60;
        debug('Drawing logo...');
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        debug('Logo drawn.');
      } catch (logoError: any) {
        if (logoError && logoError.code === 'ENOENT') {
          debug('Logo not found, skipping logo drawing.');
        } else {
          throw logoError;
        }
      }

      // --- Finalize and Upload ---
      debug('Converting canvas to buffer...');
      const buffer = canvas.toBuffer('image/png', {
        compressionLevel: 9,
        resolution: 300,
      });
      debug('Canvas converted to buffer.');

      const timestamp = new Date().getTime();
      const sanitizedTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);
      const filename = `social-card-${timestamp}-${sanitizedTitle}.png`;

      debug('Uploading file...');
      const fileData = await digitalOceanService.uploadFile(
        buffer,
        filename
      );

      return {
        success: true,
        message: 'Social card created successfully',
        data: fileData,
      };
    } catch (error: any) {
      debug('Error creating social card:', error);
      throw new Error(`Failed to create social card: ${error.message}`);
    }
  },

  /**
   * Creates a square (1080x1080) social media card.
   * @param {SquareCardParams} params - The parameters for creating the card.
   * @returns {Promise<any>} - Object with URLs for the created template.
   */
  createSquareSocialCard: async (params: SquareCardParams): Promise<any> => {
    const { imageUrl, title, subtitle } = params;
    try {
      debug(`Creating square social card with image: ${imageUrl}`);
      debug(`Title: ${title}, Subtitle: ${subtitle}`);

      const width = 1080;
      const height = 1080;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Set high-quality rendering options
      ctx.quality = 'best';
      ctx.patternQuality = 'best';
      ctx.antialias = 'subpixel';
      ctx.textDrawingMode = 'path';

      // 1. Background Color
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. Background Decorative Elements
      ctx.save();
      ctx.fillStyle = '#E8F0FE'; // Light blue/grey
      ctx.globalAlpha = 0.5; // Low opacity
      // Simple rectangles as decorative elements
      ctx.fillRect(30, 40, 80, 80); // Top-left
      ctx.fillRect(120, 700, 150, 150); // Bottom-left, below text area
      ctx.restore();

      // 3. Embedded Image (Right Side)
      const imageWidth = width * 0.45; // 45% of the canvas width
      const imageX = width - imageWidth;
      const cornerRadius = 30;

      try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        const image = await loadImage(imageBuffer);

        ctx.save();
        // Create a trapezoid clipping path with an angled left edge
        const topLeftX = width * 0.55;
        const bottomLeftX = width * 0.45;

        ctx.beginPath();
        ctx.moveTo(topLeftX, 0); // Top-left
        ctx.lineTo(width, 0); // Top-right
        ctx.lineTo(width, height); // Bottom-right
        ctx.lineTo(bottomLeftX, height); // Bottom-left
        ctx.closePath();
        ctx.clip();

        // Scale and center the image to fill the clipped area (aspect fill)
        const aspectRatio = image.width / image.height;
        let drawWidth = imageWidth;
        let drawHeight = drawWidth / aspectRatio;
        if (drawHeight < height) {
          drawHeight = height;
          drawWidth = drawHeight * aspectRatio;
        }
        const drawX = imageX + (imageWidth - drawWidth) / 2;
        const drawY = (height - drawHeight) / 2;

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

      } catch (error: any) {
        debug('Error loading or drawing embedded image:', error.message);
        // Continue without the image if it fails to load
      }

      // 4. Text Content (Left Side)
      const textX = 70;
      const rightPadding = 70;
      let currentY = 100;

      // The left edge of the image is a line. Get the x-coordinate of that line at a given y.
      const getImageBoundaryX = (y: number) => {
        const topLeftX = width * 0.55;
        const bottomLeftX = width * 0.45;
        return bottomLeftX + (topLeftX - bottomLeftX) * (1 - y / height);
      };

      const wrapAndRenderText = (text: string, font: string, color: string, lineHeight: number) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const words = text.split(' ');
        let line = '';

        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const availableWidth = getImageBoundaryX(currentY) - textX - rightPadding;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > availableWidth && i > 0) {
            ctx.fillText(line, textX, currentY);
            currentY += lineHeight;
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), textX, currentY);
        currentY += lineHeight;
      };

      // Title
      wrapAndRenderText(title, '800 65px "Poppins"', '#212150', 80);

      currentY += 20; // Space between title and subtitle

      // Subtitle
      wrapAndRenderText(subtitle, '500 28px "Poppins"', '#5F6368', 40);

      // 5. Logo
      try {
        const logoPath = path.join(process.cwd(), 'assets', 'aiadaptiv-text-logo.png');
        const logo = await loadImage(logoPath);
        const logoAspectRatio = logo.width / logo.height;
        const logoHeight = 40;
        const logoWidth = logoHeight * logoAspectRatio;
        ctx.drawImage(logo, textX, height - logoHeight - 70, logoWidth, logoHeight);
      } catch (logoError: any) {
        debug('Logo not found, skipping logo drawing.');
      }

      // 6. Finalize and Upload
      debug('Converting canvas to buffer...');
      const buffer = canvas.toBuffer('image/png', { compressionLevel: 9, resolution: 300 });
      const timestamp = new Date().getTime();
      const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
      const filename = `square-card-${timestamp}-${sanitizedTitle}.png`;

      debug('Uploading file...');
      const fileData = await digitalOceanService.uploadFile(buffer, filename);

      return {
        success: true,
        message: 'Square social card created successfully',
        data: fileData,
      };

    } catch (error: any) {
      debug('Error creating square social card:', error);
      throw new Error(`Failed to create square social card: ${error.message}`);
    }
  }
};
