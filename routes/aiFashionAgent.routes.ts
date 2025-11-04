import express from "express";
import { aiFashionAgentController } from "../controllers/aiFashionAgent.controller";
import { Request, Response, NextFunction } from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("AI Fashion Agent route is working");
});

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Main endpoint for generating fashion combinations
router.post("/generate-outfit", asyncHandler(aiFashionAgentController.generateOutfit));

// Health check endpoint
router.get("/health", asyncHandler(aiFashionAgentController.healthCheck));

export default router;