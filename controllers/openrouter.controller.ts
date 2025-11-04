import { Request, Response } from "express";

type OpenRouterController = {
  nanoBanana: (req: Request, res: Response) => void;
};

export const openrouterController: OpenRouterController = {
  nanoBanana: (req: Request, res: Response) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          status: "error",
          message: "Content is required in the request body"
        });
      }

      const openRouterRequest = {
        "model": "google/gemini-2.5-flash-image-preview",
        "messages": [
          {
            "role": "user",
            "content": content
          }
        ]
      };

      return res.status(200).json(openRouterRequest);
    } catch (error) {
      console.error("Error in nanoBanana controller:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  }
};