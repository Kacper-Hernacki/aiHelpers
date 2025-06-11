// services/template/socialCardTemplate.service.ts
import { createCanvas, loadImage, Canvas, Image } from 'canvas';
import { digitalOceanService } from '../storage/digitalOcean.service.js';
import path from 'path';
import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), '|', ...args);
};

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
      const wrappedTitle = wrapText(title, textMaxWidth, ctx.font);
      let currentY = 100;
      wrappedTitle.forEach((line) => {
        ctx.fillText(line, textX, currentY);
        currentY += titleLineHeight;
      });

      // Subtitle
      const subtitle = 'Discover the future of AI-driven content creation and design.';
      ctx.font = 'bold 28px "Poppins"'; // Bold weight
      ctx.fillStyle = '#05b4d5'; // Cyan/turquoise color
      const subtitleLineHeight = 40;
      currentY += 20;
      const wrappedSubtitle = wrapText(subtitle, textMaxWidth, ctx.font);
      wrappedSubtitle.forEach((line) => {
        ctx.fillText(line, textX, currentY);
        currentY += subtitleLineHeight;
      });

      // --- Image with Trapezoid Clip ---
      const image = await loadImage(imageUrl);
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

      // Logic to scale and center the image to fill the trapezoid
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

      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();

      // --- Logo ---
      try {
        const logoPath = path.join(process.cwd(), 'assets', 'aiadaptiv-text-logo.png');
        const logo = await loadImage(logoPath);
        const logoAspectRatio = logo.width / logo.height;
        const logoHeight = 45;
        const logoWidth = logoHeight * logoAspectRatio;
        const logoX = 80;
        const logoY = baseHeight - logoHeight - 60;
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } catch (logoError: any) {
        if (logoError && logoError.code === 'ENOENT') {
          debug('Logo not found, skipping logo drawing.');
        } else {
          throw logoError;
        }
      }

      // --- Finalize and Upload ---
      const buffer = canvas.toBuffer('image/png', {
        compressionLevel: 9,
        resolution: 300,
      });

      const timestamp = new Date().getTime();
      const sanitizedTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);
      const filename = `social-card-${timestamp}-${sanitizedTitle}.png`;

      const fileData = await digitalOceanService.uploadFile(
        buffer,
        filename,
        'image/png'
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
  }
};
