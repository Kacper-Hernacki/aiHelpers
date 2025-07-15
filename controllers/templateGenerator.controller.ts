// controllers/templateGenerator.controller.ts
import { Request, Response } from "express";
import { socialCardTemplateService } from "../services/template/socialCardTemplate.service.js";

// Debug logging function
const debug = (...args: any[]) => {
  console.log(new Date().toISOString(), "|", ...args);
};

export const templateGeneratorController = {
  /**
   * Generate an article thumbnail using Replicate image and title
   * Endpoint: POST /api/template/generate-thumbnail
   */
  generateArticleThumbnail: async (req: Request, res: Response) => {
    try {
      debug("Received thumbnail generation request");
      const { replicateResponse, title } = req.body;

      // Validation
      if (!replicateResponse) {
        return res.status(400).json({
          success: false,
          message: "Missing Replicate response in request body",
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Missing article title in request body",
        });
      }

      // Parse and validate the Replicate response
      let imageUrl: string;

      try {
        // Handle if replicateResponse is a string (parsed JSON)
        if (typeof replicateResponse === "string") {
          const parsed = JSON.parse(replicateResponse);
          if (Array.isArray(parsed) && parsed.length > 0) {
            imageUrl = parsed[0].output;
          } else {
            imageUrl = parsed.output;
          }
        }
        // Handle if replicateResponse is an array with objects
        else if (
          Array.isArray(replicateResponse) &&
          replicateResponse.length > 0
        ) {
          imageUrl = replicateResponse[0].output;
        }
        // Handle if replicateResponse is an object with output directly
        else if (replicateResponse.output) {
          imageUrl = replicateResponse.output;
        }
        // Handle if replicateResponse is the flux response format provided
        else if (replicateResponse[0]?.output) {
          imageUrl = replicateResponse[0].output;
        }
        // Handle if it's the flux format from the example
        else if (
          replicateResponse[0]?.status === "processing" &&
          replicateResponse[0]?.output
        ) {
          imageUrl = replicateResponse[0].output;
        }
        // If it's the exact flux format from the example
        else {
          imageUrl =
            replicateResponse[0]?.output ||
            replicateResponse[0]?.urls?.stream ||
            "";
        }
      } catch (error) {
        debug("Error parsing Replicate response:", error);
        return res.status(400).json({
          success: false,
          message: "Invalid Replicate response format",
        });
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Could not find image URL in Replicate response",
        });
      }

      debug(`Using image URL: ${imageUrl}`);

      // Generate the social card
      const result = await socialCardTemplateService.createSocialCard(
        imageUrl,
        title
      );

      return res.status(200).json({
        success: true,
        message: "Social card generated successfully",
        data: result.data,
      });
    } catch (error: any) {
      debug("Template generation error:", error);
      return res.status(500).json({
        success: false,
        message: `Error generating template: ${error.message}`,
      });
    }
  },

  /**
   * Generate a square thumbnail for social media.
   * Endpoint: POST /api/template/generate-square-thumbnail
   */
  generateSquareThumbnail: async (req: Request, res: Response) => {
    try {
      debug("Received square thumbnail generation request");
      const { replicateResponse, title, subtitle } = req.body;

      // Validation
      if (!replicateResponse) {
        return res.status(400).json({
          success: false,
          message: "Missing Replicate response in request body",
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Missing title in request body",
        });
      }

      if (!subtitle) {
        return res.status(400).json({
          success: false,
          message: "Missing subtitle in request body",
        });
      }

      // Parse and validate the Replicate response (same logic as generateArticleThumbnail)
      let imageUrl: string;

      try {
        // Handle if replicateResponse is a string (parsed JSON)
        if (typeof replicateResponse === "string") {
          const parsed = JSON.parse(replicateResponse);
          if (Array.isArray(parsed) && parsed.length > 0) {
            imageUrl = parsed[0].output;
          } else {
            imageUrl = parsed.output;
          }
        }
        // Handle if replicateResponse is an array with objects
        else if (
          Array.isArray(replicateResponse) &&
          replicateResponse.length > 0
        ) {
          imageUrl = replicateResponse[0].output;
        }
        // Handle if replicateResponse is an object with output directly
        else if (replicateResponse.output) {
          imageUrl = replicateResponse.output;
        }
        // Handle if replicateResponse is the flux response format provided
        else if (replicateResponse[0]?.output) {
          imageUrl = replicateResponse[0].output;
        }
        // Handle if it's the flux format from the example
        else if (
          replicateResponse[0]?.status === "processing" &&
          replicateResponse[0]?.output
        ) {
          imageUrl = replicateResponse[0].output;
        }
        // If it's the exact flux format from the example
        else {
          imageUrl =
            replicateResponse[0]?.output ||
            replicateResponse[0]?.urls?.stream ||
            "";
        }
      } catch (error) {
        debug("Error parsing Replicate response:", error);
        return res.status(400).json({
          success: false,
          message: "Invalid Replicate response format",
        });
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Could not find image URL in Replicate response",
        });
      }

      debug(`Using image URL for square thumbnail: ${imageUrl}`);

      // Generate the square social card
      const result = await socialCardTemplateService.createSquareSocialCard({
        imageUrl,
        title,
        subtitle,
      });

      return res.status(200).json({
        success: true,
        message: "Square social card generated successfully",
        data: result.data,
      });
    } catch (error: any) {
      debug("Square template generation error:", error);
      return res.status(500).json({
        success: false,
        message: `Error generating square template: ${error.message}`,
      });
    }
  },
};
