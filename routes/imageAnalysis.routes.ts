import express from "express";
import { imageAnalysisController } from "../controllers/imageAnalysis.controller";
import { Request, Response, NextFunction } from "express";

const router = express.Router();

// Add a simple GET route for testing
router.get("/", (req, res) => {
  res.send("Image analysis route is working");
});

// Wrapper to handle async controller functions
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Add the image analysis endpoint (file handling is done inside the controller)
router.post("/analyze-image", asyncHandler(imageAnalysisController.analyzeImage));

export default router;
