import express from "express";
import { notesController } from "../controllers/notes.controller";

const router = express.Router();

router.post("/add/youtube", notesController.addYoutubeNotes);

export default router;
