import { Request, Response } from "express";
import { transcriptYoutubeVideo } from "../utils/youtube/transcriptYoutubeVideo";

export const youtubeController = {
  transcriptYoutubeVideo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { url, language } = req.body;
      console.log("url", url);
      const response = await transcriptYoutubeVideo(url, language);

      res.status(201).json({ status: "success", response });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting transcript");
    }
  },
};
