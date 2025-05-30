// routes/templateGenerator.routes.ts
import express from "express";
import { templateGeneratorController } from "../controllers/templateGenerator.controller";
import { Request, Response, NextFunction } from "express";

const router = express.Router();

// Add a simple GET route for testing
router.get("/", (req, res) => {
  res.send("Template generator route is working");
});

// Wrapper to handle async controller functions
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Add the thumbnail generation endpoint
router.post("/generate-thumbnail", asyncHandler(templateGeneratorController.generateArticleThumbnail));

export default router;
