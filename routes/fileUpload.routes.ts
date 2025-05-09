import express from "express";
import { uploadFile } from "../controllers/fileUpload.controller";
import { Request, Response, NextFunction } from "express";

const router = express.Router();

// Add a simple GET route for testing
router.get("/", (req, res) => {
  res.send("File upload route is working");
});

// Wrapper to handle async controller functions
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Add the upload endpoint with async handler
router.post("/upload", asyncHandler(uploadFile));

export default router;
