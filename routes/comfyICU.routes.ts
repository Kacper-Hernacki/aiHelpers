import express from "express";
import { comfyICUController } from "../controllers/comfyICU.controller";

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

export default router;
