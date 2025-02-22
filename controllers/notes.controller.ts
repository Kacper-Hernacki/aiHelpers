import { Request, Response } from "express";
import { transcriptYoutubeVideo } from "../utils/youtube/transcriptYoutubeVideo";
import { splitDocuments } from "../utils/text/recursiveTextSplitter";

export const notesController = {
  addYoutubeNotes: async (req: Request, res: Response): Promise<void> => {
    try {
      const { url, language } = req.body;
      const convertedTranscriptFromYoutubeVideo = await transcriptYoutubeVideo(
        url,
        language
      );

      const splitDocs = await splitDocuments(
        convertedTranscriptFromYoutubeVideo.transcript
      );

      // todo: make a summary of the splitDocs
      // todo: upload summary to notion
      // todo: add the splitDocs to pinecone
      // todo: think about graphs

      //   const response = await uploadNotesToNotion(splitDocs);
      res.status(201).json({ status: "success", splitDocs });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting transcript");
    }
  },
};
