import express from "express";
import { youtubeController } from "../controllers/youtube.controller.js";

const router = express.Router();

// Existing YouTube functionality
router.post("/transcript", youtubeController.transcriptYoutubeVideo);

// New YouTube RAG functionality
/**
 * @route POST /youtube/process-for-rag
 * @description Process YouTube video transcript for hybrid RAG system
 * @body { url: string, language?: string }
 * @returns { success: boolean, data: YouTubeRAGData }
 */
router.post('/process-for-rag', youtubeController.processForRAG);

/**
 * @route POST /youtube/process-with-examples
 * @description Process YouTube video with implementation examples
 * @body { url: string, language?: string }
 * @returns { success: boolean, data: YouTubeRAGData, implementationExamples: object }
 */
router.post('/process-with-examples', youtubeController.processWithExamples);

export default router;
