// services/template/socialCardTemplate.service.ts
import { createCanvas, loadImage, Canvas, Image } from 'canvas';
import { digitalOceanService } from '../storage/digitalOcean.service';
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

      // Create canvas with 16:9 aspect ratio
      const width = 1200;
      const height = 675;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Fill background with white/light gray gradient - similar to the provided image
      const backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
      backgroundGradient.addColorStop(0, '#ffffff');
      backgroundGradient.addColorStop(1, '#f5f5f5');
      ctx.fillStyle = backgroundGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add some subtle diagonal lines for texture
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1;
      for (let i = -height; i < width*2; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height, height);
        ctx.stroke();
      }

      // Define the layout areas
      const leftPadding = 80;
      const rightPadding = 80;
      const textAreaWidth = width * 0.5 - leftPadding;
      const imageAreaWidth = width * 0.5 - rightPadding;
      const imageAreaHeight = height * 0.75;

      // Split title for styling if it contains a colon or dash
      let mainTitle = title;
      let subtitle = '';
      
      if (title.includes(':')) {
        const parts = title.split(':', 2);
        mainTitle = parts[0];
        subtitle = parts.length > 1 ? parts[1].trim() : '';
      } else if (title.includes(' - ')) {
        const parts = title.split(' - ', 2);
        mainTitle = parts[0];
        subtitle = parts.length > 1 ? parts[1].trim() : '';
      }

      // Add "Top" text like in the example
      ctx.font = 'bold 60px Arial, sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';
      ctx.fillText('Top', leftPadding, 180);
      
      // Text wrapping function
      const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
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

      // Draw the main part of the title in blue
      ctx.font = 'bold 60px Arial, sans-serif';
      ctx.fillStyle = '#4169E1'; // Royal blue
      const mainLines = wrapText(mainTitle, textAreaWidth, 60);
      mainLines.forEach((line, i) => {
        ctx.fillText(line, leftPadding, 240 + (i * 70));
      });
      
      // Draw the subtitle in black if it exists
      if (subtitle) {
        ctx.fillStyle = '#000000';
        const subLines = wrapText('for ' + subtitle, textAreaWidth, 60);
        const startY = 240 + (mainLines.length * 70);
        subLines.forEach((line, i) => {
          ctx.fillText(line, leftPadding, startY + (i * 70));
        });
      }

      // Load and draw the image on the right side
      const image = await loadImage(imageUrl);
      
      // Calculate dimensions to maintain aspect ratio
      const imageRatio = image.width / image.height;
      let drawWidth = imageAreaWidth;
      let drawHeight = drawWidth / imageRatio;
      
      if (drawHeight > imageAreaHeight) {
        drawHeight = imageAreaHeight;
        drawWidth = drawHeight * imageRatio;
      }
      
      // Position the image on the right side
      const imageX = width - imageAreaWidth - rightPadding + (imageAreaWidth - drawWidth) / 2;
      const imageY = (height - drawHeight) / 2;
      
      // Save context for rotation and custom shape
      ctx.save();
      
      // Define the center point of the image for rotation
      const centerX = imageX + drawWidth / 2;
      const centerY = imageY + drawHeight / 2;
      
      // Translate to center, rotate, and translate back
      ctx.translate(centerX, centerY);
      ctx.rotate(5 * Math.PI / 180); // Rotate 5 degrees
      ctx.translate(-centerX, -centerY); // CRITICAL: Translate origin back

      // This code defines and paths an equilateral triangle intended to be largely visible on the canvas.
      // Requirements:
      // - Shape: Equilateral triangle (visually on canvas, before context rotation).
      // - Altitude: 98% of the canvas height.
      // - Orientation: Upright (one horizontal base at the bottom) before context rotation.
      // - Horizontal Position: Positioned towards the right of the canvas.
      // - Vertical Position: Centered vertically on the canvas.

      const desiredAltitude = height * 0.98; // Altitude of the equilateral triangle
      const desiredSideLength = (2 * desiredAltitude) / Math.sqrt(3); // Side length of the equilateral triangle

      // Calculate Y coordinates for the vertices (for an upright triangle)
      const y_top_vertex = (height - desiredAltitude) / 2; // Y-coordinate of the top vertex
      const y_bottom_vertices = y_top_vertex + desiredAltitude; // Y-coordinate of the two bottom vertices

      // Calculate X coordinates for the vertices, positioning the triangle on the right
      const paddingFromRight = 80; // Adjust as needed for desired right-side positioning
      const x_bottom_right_vertex = width - paddingFromRight;
      const x_bottom_left_vertex = x_bottom_right_vertex - desiredSideLength;
      const x_top_center_vertex = x_bottom_left_vertex + desiredSideLength / 2;

      // Define the path for the equilateral triangle
      ctx.beginPath();
      ctx.moveTo(x_top_center_vertex, y_top_vertex);             // Move to top vertex
      ctx.lineTo(x_bottom_right_vertex, y_bottom_vertices);    // Line to bottom-right vertex
      ctx.lineTo(x_bottom_left_vertex, y_bottom_vertices);     // Line to bottom-left vertex
      ctx.closePath(); // Connect back to the top vertex, completing the triangle

      // Add a subtle shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw the image within this custom shape
      ctx.drawImage(image, imageX, imageY, drawWidth, drawHeight);
      
      ctx.restore();
      
      // Draw the company logo and name at the bottom left
      const logoX = leftPadding;
      const logoY = height - 60; // Position slightly higher
      const logoSize = 45; // Size of the logo
      
      // Try to load SVG logo first, then fallback to PNG
      try {
        // Use resvg-js to render SVG to PNG
        const svgLogoPath = path.join(process.cwd(), 'assets', 'logo.svg');
        
        if (fs.existsSync(svgLogoPath)) {
          debug(`Loading SVG logo from: ${svgLogoPath}`);
          
          // Use resvg-js to convert SVG to PNG
          const svgBuffer = fs.readFileSync(svgLogoPath);
          const resvg = new Resvg(svgBuffer, {
            fitTo: {
              mode: 'width',
              value: logoSize * 2, // Higher resolution for better quality
            },
          });
          const pngData = resvg.render();
          const logoImg = await loadImage(Buffer.from(pngData.asPng()));
          
          // Calculate logo dimensions (preserve aspect ratio)
          const logoHeight = logoSize;
          const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
          
          // Vertical alignment adjustment to match text
          // Position logo so its vertical center aligns with text baseline
          const logoVerticalOffset = 2; // Fine tuning to align with text
          
          // Draw the logo at the specified position with adjusted vertical alignment
          ctx.drawImage(logoImg, logoX, logoY - logoHeight/2 + logoVerticalOffset, logoWidth, logoHeight);
          debug('SVG logo loaded and drawn successfully using resvg-js');
        } else {
          throw new Error('SVG logo file not found');
        }
      } catch (svgError) {
        // Fallback to PNG logo
        try {
          const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
          debug(`Fallback: Loading PNG logo from: ${logoPath}`);
          
          const logoImg = await loadImage(logoPath);
          const logoHeight = logoSize;
          const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
          
          // Apply the same vertical alignment adjustment as for SVG
          const logoVerticalOffset = 2;
          ctx.drawImage(logoImg, logoX, logoY - logoHeight/2 + logoVerticalOffset, logoWidth, logoHeight);
          debug('PNG logo loaded and drawn successfully');
        } catch (pngError) {
          debug('Error loading both SVG and PNG logos:', pngError);
          
          // Final fallback: Draw a simple blue rectangle
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(logoX, logoY - logoSize/2, logoSize, logoSize);
        }
      }
      
      // Add company name next to the logo with a gradient
      // Use the logo size plus spacing for positioning if logoWidth is not defined
      const logoTextSpacing = 15;
      const companyNameX = logoX + logoSize * 1.2 + logoTextSpacing;
      const companyNameY = logoY + 5; // Center with the logo
      
      // Create a gradient for the text
      const textGradient = ctx.createLinearGradient(companyNameX, companyNameY - 30, companyNameX + 180, companyNameY);
      textGradient.addColorStop(0, '#3B82F6'); // Bright blue
      textGradient.addColorStop(1, '#1E40AF'); // Darker blue
      
      // Set text properties
      ctx.textAlign = 'left';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.fillStyle = textGradient;
      ctx.fillText('aiAdaptiv', companyNameX, companyNameY);
      
      // Convert canvas to buffer
      const buffer = canvas.toBuffer('image/png');
      
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const sanitizedTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);
      
      const filename = `social-card-${timestamp}-${sanitizedTitle}.png`;
      
      // Upload to Digital Ocean Spaces
      const fileData = await digitalOceanService.uploadFile(buffer, filename, 'image/png');
      
      return {
        success: true,
        message: "Social card created successfully",
        data: fileData
      };
    } catch (error: any) {
      debug('Error creating social card:', error);
      throw new Error(`Failed to create social card: ${error.message}`);
    }
  }
};
