import express from "express";
import { openrouterController } from "../controllers/openrouter.controller";
import { Request, Response, NextFunction } from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("OpenRouter route is working");
});

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post("/nano-banana", asyncHandler(openrouterController.nanoBanana));

export default router;