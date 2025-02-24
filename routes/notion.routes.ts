import express from "express";
import { notionController } from "../controllers/notion.controller";

const router = express.Router();

router.get("/calendar/vacation", notionController.getVacationCalendar);

export default router;
