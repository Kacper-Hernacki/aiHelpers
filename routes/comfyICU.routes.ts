import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { comfyICUController } from "../controllers/comfyICU.controller";

// Set up multer for file uploads
// Create uploads directory in the root of the aiHelpers project
const uploadsDir = path.join(process.cwd(), "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory at: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(`Saving file to: ${uploadsDir}`);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log(
      `Received file upload: ${file.originalname}, type: ${file.mimetype}`
    );
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!") as any);
    }
  },
});

const router = express.Router();

// Run a workflow (workflow_id in URL)
router.post("/workflows/:workflow_id/runs", comfyICUController.runWorkflow);

// Run a workflow (workflow_id in body)
router.post("/run", comfyICUController.runWorkflow);

// Get run status
router.get(
  "/workflows/:workflow_id/runs/:run_id",
  comfyICUController.getRunStatus
);

// Generate image with a complete workflow
router.post("/generate-image", comfyICUController.generateImage);

// Run the exact workflow with predefined structure
router.post("/exact-workflow", comfyICUController.runExactWorkflow);

// Face swap using a reference face image URL
router.post("/face-swap", comfyICUController.faceSwap);

// Face swap with file upload (for Postman)
router.post(
  "/face-swap-upload",
  upload.single("face_image"),

  comfyICUController.faceSwapUpload
);

// Test ComfyICU API connection
router.get("/test-connection", comfyICUController.testComfyICUConnection);

export default router;
