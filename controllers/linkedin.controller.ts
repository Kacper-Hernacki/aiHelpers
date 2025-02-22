import { Request, Response } from "express";
import { getPostContent } from "../utils/linkedIn/linkedInHelper";
export const linkedinController = {
  extractLinkedInPost: async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body;
      const response = await getPostContent(url);
      res.status(201).json({ status: "success", response });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting transcript");
    }
  },
};
