import express from "express";
import { uploadFile, getFile, downloadFile, uploadMultipleFiles } from "../controllers/fileUpload.controller";
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

// Add endpoint to get file information by filename
// Moving this to a more specific route to avoid conflicts
router.get("/info/:filename", asyncHandler(getFile));

// Add endpoint to download files directly
router.get("/download/:filename", asyncHandler(downloadFile));

// Add endpoint for uploading multiple files at once
router.post("/upload-multiple", asyncHandler(uploadMultipleFiles));

export default router;
