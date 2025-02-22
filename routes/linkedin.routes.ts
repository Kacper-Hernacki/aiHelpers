import express from "express";
import { linkedinController } from "../controllers/linkedin.controller";

const router = express.Router();

router.post("/extract", linkedinController.extractLinkedInPost);

export default router;
