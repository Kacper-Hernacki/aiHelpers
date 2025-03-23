import { Request, Response } from "express";
import { comfyICUService } from "../services/comfyUi/comfyICU.service";

export const comfyICUController = {
  runWorkflow: async (req: Request, res: Response): Promise<void> => {
    try {
      const workflow_id = req.params.workflow_id || req.body.workflow_id;
      const { prompt, files, webhook, accelerator } = req.body;

      if (!workflow_id || !prompt) {
        res.status(400).json({
          status: "error",
          message: "workflow_id and prompt are required",
        });
        return;
      }

      const response = await comfyICUService.runWorkflow({
        workflow_id,
        prompt,
        files,
        webhook,
        accelerator,
      });

      res.status(201).json({ status: "success", run: response });
    } catch (error) {
      console.error("Error running ComfyICU workflow:", error);
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Error running workflow",
      });
    }
  },

  getRunStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflow_id, run_id } = req.params;

      if (!workflow_id || !run_id) {
        res.status(400).json({
          status: "error",
          message: "workflow_id and run_id are required",
        });
        return;
      }

      const status = await comfyICUService.getRunStatus(workflow_id, run_id);
      res.status(200).json({ status: "success", run: status });
    } catch (error) {
      console.error("Error getting ComfyICU run status:", error);
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Error getting run status",
      });
    }
  },

  runExactWorkflow: async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflow_id } = req.body;

      if (!workflow_id) {
        res.status(400).json({
          status: "error",
          message: "workflow_id is required",
        });
        return;
      }

      // Predefined prompt for workflow gXemm8zr-benTusYm3EP1
      // This is an exact copy from the ComfyICU API example but with fixed connections
      const prompt = {
        "1": {
          inputs: {
            ckpt_name: "dreamshaper_8.safetensors",
          },
          class_type: "CheckpointLoaderSimple",
        },
        "2": {
          inputs: {
            width: 512,
            height: 512,
            batch_size: 1,
          },
          class_type: "EmptyLatentImage",
        },
        "3": {
          inputs: {
            clip: ["1", 1],
            text:
              req.body.prompt_text ||
              "futuristic city with flying cars, detailed, vibrant colors",
          },
          class_type: "CLIPTextEncode",
        },
        "4": {
          inputs: {
            clip: ["1", 1],
            text: "ugly, deformed, noisy, blurry, distorted, disfigured",
          },
          class_type: "CLIPTextEncode",
        },
        "5": {
          inputs: {
            model: ["1", 0],
            latent_image: ["2", 0],
            positive: ["3", 0],
            negative: ["4", 0],
            sampler_name: "euler_ancestral",
            scheduler: "normal",
            seed: req.body.seed || 42,
            steps: 30,
            cfg: 7,
            denoise: 1,
          },
          class_type: "KSampler",
        },
        "6": {
          inputs: {
            samples: ["5", 0],
            vae: ["1", 2],
          },
          class_type: "VAEDecode",
        },
        "7": {
          inputs: {
            images: ["6", 0],
            filename_prefix: "ComfyUI",
          },
          class_type: "SaveImage",
        },
      };

      // Execute and wait for results
      const result = await comfyICUService.runWorkflowAndWaitForCompletion({
        workflow_id,
        prompt,
        files: req.body.files || {},
        accelerator: req.body.accelerator,
      });

      res.status(200).json({
        status: "success",
        message: "Image generation complete",
        result,
        imageUrl:
          result.outputs && result.outputs.length > 0
            ? result.outputs[0].url
            : null,
      });
    } catch (error) {
      console.error("Error running exact workflow:", error);
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Error running workflow",
      });
    }
  },

  generateImage: async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflow_id, prompt_text, seed, files, accelerator } = req.body;

      if (!workflow_id) {
        res.status(400).json({
          status: "error",
          message: "workflow_id is required",
        });
        return;
      }

      // Use provided text or default
      const text =
        prompt_text || "a beautiful landscape with mountains and a lake";
      // Use provided seed or random
      const randomSeed = Math.floor(Math.random() * 999999999);
      const promptSeed = seed || randomSeed;

      // Use the fixed prompt structure with proper connections
      const prompt = {
        "1": {
          inputs: {
            ckpt_name: "dreamshaper_8.safetensors",
          },
          class_type: "CheckpointLoaderSimple",
        },
        "2": {
          inputs: {
            width: 512,
            height: 512,
            batch_size: 1,
          },
          class_type: "EmptyLatentImage",
        },
        "3": {
          inputs: {
            clip: ["1", 1],
            text: text,
          },
          class_type: "CLIPTextEncode",
        },
        "4": {
          inputs: {
            clip: ["1", 1],
            text: "ugly, deformed, noisy, blurry, distorted, disfigured",
          },
          class_type: "CLIPTextEncode",
        },
        "5": {
          inputs: {
            model: ["1", 0],
            latent_image: ["2", 0],
            positive: ["3", 0],
            negative: ["4", 0],
            sampler_name: "euler_ancestral",
            scheduler: "normal",
            seed: promptSeed,
            steps: 30,
            cfg: 7,
            denoise: 1,
          },
          class_type: "KSampler",
        },
        "6": {
          inputs: {
            samples: ["5", 0],
            vae: ["1", 2],
          },
          class_type: "VAEDecode",
        },
        "7": {
          inputs: {
            images: ["6", 0],
            filename_prefix: "ComfyUI",
          },
          class_type: "SaveImage",
        },
      };

      // Execute and wait for results
      const result = await comfyICUService.runWorkflowAndWaitForCompletion({
        workflow_id,
        prompt,
        files,
        accelerator,
      });

      res.status(200).json({
        status: "success",
        message: "Image generation complete",
        result,
        imageUrl:
          result.outputs && result.outputs.length > 0
            ? result.outputs[0].url
            : null,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Error generating image",
      });
    }
  },
};
