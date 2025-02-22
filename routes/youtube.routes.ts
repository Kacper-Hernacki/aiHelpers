import express from "express";
import { youtubeController } from "../controllers/youtube.controller";

const router = express.Router();

router.post("/transcript", youtubeController.transcriptYoutubeVideo);

export default router;
