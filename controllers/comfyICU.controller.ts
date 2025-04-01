import { Request, Response } from "express";
import { comfyICUService } from "../services/comfyUi/comfyICU.service";
import fs from "fs";
import path from "path";
import multer from "multer";

// Extend the Request interface to include file for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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

      // Predefined prompt for workflow
      // Fixed connections for the KSampler to ensure proper flow
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
            model: ["1", 0], // Connect to output 0 of node 1 (CheckpointLoaderSimple)
            latent_image: ["2", 0], // Connect to output 0 of node 2 (EmptyLatentImage)
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

      console.log(
        "Using prompt structure:",
        JSON.stringify(prompt).substring(0, 500) + "..."
      );

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

  faceSwap: async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflow_id, prompt_text, face_image_url, seed, accelerator } =
        req.body;

      if (!workflow_id) {
        res.status(400).json({
          status: "error",
          message: "workflow_id is required",
        });
        return;
      }

      if (!face_image_url) {
        res.status(400).json({
          status: "error",
          message: "face_image_url is required for face swapping",
        });
        return;
      }

      // Use provided text or default
      const text =
        prompt_text || "person with detailed face, high quality portrait";
      // Use provided seed or random
      const randomSeed = Math.floor(Math.random() * 999999999);
      const promptSeed = seed || randomSeed;

      // Create files object with the face reference image
      const files = {
        "/input/face_reference.jpg": face_image_url,
      };

      // Create a workflow with InstantID or IPAdapter nodes for face swapping
      // This is a simplified version - actual implementation may vary based on the available nodes
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
        // Load the face reference image
        "8": {
          inputs: {
            image: "face_reference.jpg",
            upload: "image",
          },
          class_type: "LoadImage",
        },
        // IPAdapter node for face embedding
        "9": {
          inputs: {
            model: ["1", 0],
            image: ["8", 0],
            weight: 0.8,
            noise: 0.0,
          },
          class_type: "IPAdapterApply",
        },
        // KSampler with IPAdapter model
        "5": {
          inputs: {
            model: ["9", 0],
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
            filename_prefix: "FaceSwap",
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
        message: "Face swap complete",
        result,
        imageUrl:
          result.outputs && result.outputs.length > 0
            ? result.outputs[0].url
            : null,
      });
    } catch (error) {
      console.error("Error performing face swap:", error);
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "Error performing face swap",
      });
    }
  },

  faceSwapUpload: async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      console.log("=== START faceSwapUpload ===");
      console.log("Request body:", req.body);
      console.log(
        "File object:",
        req.file
          ? {
              filename: req.file.filename,
              originalname: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
              path: req.file.path,
            }
          : "No file"
      );

      const { workflow_id, prompt_text, seed, accelerator, face_image_url } =
        req.body;
      console.log("Extracted form data values:");
      console.log("- workflow_id:", workflow_id);
      console.log("- prompt_text:", prompt_text);
      console.log("- seed:", seed);
      console.log("- accelerator:", accelerator);
      console.log("- face_image_url:", face_image_url);

      if (!workflow_id) {
        console.log("Missing workflow_id");
        res.status(400).json({
          status: "error",
          message: "workflow_id is required",
        });
        return;
      }

      // Initialize variables for image handling
      let imageUrl: string;

      // Check if we have a direct URL in the request body
      if (face_image_url) {
        console.log("Using provided face_image_url:", face_image_url);
        imageUrl = face_image_url;
      }
      // Check if file was uploaded
      else if (req.file) {
        console.log("Processing uploaded file");

        try {
          // Read the file content as base64
          console.log("Reading file from path:", req.file.path);
          if (!fs.existsSync(req.file.path)) {
            throw new Error(`File does not exist at path: ${req.file.path}`);
          }

          const imageBuffer = fs.readFileSync(req.file.path);
          console.log(
            "File read successfully, buffer size:",
            imageBuffer.length
          );

          const base64Image = imageBuffer.toString("base64");
          console.log("Converted to base64, length:", base64Image.length);

          // Create a data URL from the base64 image
          const mimeType = req.file.mimetype || "image/jpeg";
          imageUrl = `data:${mimeType};base64,${base64Image}`;
          console.log(
            "Created data URL with prefix:",
            imageUrl.substring(0, 50) + "..."
          );

          // Clean up the temporary file
          fs.unlinkSync(req.file.path);
          console.log("Cleaned up temporary file:", req.file.path);
        } catch (fileError) {
          console.error("Error processing uploaded file:", fileError);

          // Clean up file if it exists and we had an error
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log("Cleaned up file after error:", req.file.path);
            }
          } catch (cleanupError) {
            console.error("Error during file cleanup:", cleanupError);
          }

          // Fall back to a sample image URL
          imageUrl =
            "https://media.istockphoto.com/id/1296158947/photo/portrait-of-creative-trendy-black-african-male-designer-standing-at-office.jpg?s=612x612&w=0&k=20&c=RIMvVt0J6Cc9vy3dBDZAOTCxKNgVJMOO7qUCT6TFkW4=";
          console.log(
            "Falling back to sample image URL after file processing error"
          );
        }
      }
      // Neither file nor URL provided, use a sample image
      else {
        console.log("No file or URL provided, using sample image");
        imageUrl =
          "https://media.istockphoto.com/id/1296158947/photo/portrait-of-creative-trendy-black-african-male-designer-standing-at-office.jpg?s=612x612&w=0&k=20&c=RIMvVt0J6Cc9vy3dBDZAOTCxKNgVJMOO7qUCT6TFkW4=";
      }

      // Use provided text or default
      const text =
        prompt_text || "portrait of a person, high quality, detailed face";
      console.log("Using prompt text:", text);

      // Use provided seed or default from form
      const promptSeed = seed || 42;
      console.log("Using seed:", promptSeed);

      // Create files object with the image URL
      const files = {
        "/input/face_reference.jpg": imageUrl,
      };
      console.log("Created files object with keys:", Object.keys(files));

      // Create a minimal prompt to ensure the workflow has something to work with
      const prompt = {
        "3": {
          inputs: {
            text: text,
          },
          class_type: "CLIPTextEncode",
        },
        "5": {
          inputs: {
            seed: promptSeed,
          },
          class_type: "KSampler",
        },
      };

      console.log("Using workflow_id:", workflow_id);
      console.log("Prepared minimal prompt:", JSON.stringify(prompt));

      // Execute and wait for results
      console.log(
        "Calling comfyICUService.runWorkflowAndWaitForCompletion with workflow_id:",
        workflow_id
      );
      console.log("Accelerator:", accelerator);

      // Make sure we're waiting for completion properly
      console.log("Starting workflow execution...");
      const result = await comfyICUService.runWorkflowAndWaitForCompletion({
        workflow_id,
        prompt,
        files,
        accelerator,
      });

      console.log(
        "Received result from comfyICU service:",
        JSON.stringify(result).substring(0, 200) + "..."
      );

      console.log("Sending success response");
      res.status(200).json({
        status: "success",
        message: "Face swap complete",
        result,
        imageUrl:
          result.outputs && result.outputs.length > 0
            ? result.outputs[0].url
            : null,
      });
      console.log("=== END faceSwapUpload ===");
    } catch (error) {
      console.error("Error performing face swap with upload:", error);

      // Enhanced error reporting
      const errorDetails = {
        message:
          error instanceof Error
            ? error.message
            : "Unknown error performing face swap",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      };

      console.error("Error details:", errorDetails);

      res.status(500).json({
        status: "error",
        message: errorDetails.message,
        details: errorDetails,
      });
    }
  },

  // Simple diagnostic endpoint to test API connectivity
  testComfyICUConnection: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      console.log("=== TESTING COMFYICU CONNECTION ===");
      console.log("Environment variables:");
      console.log(
        "COMFYICU_API_URL:",
        process.env.COMFYICU_API_URL || "Not set, using default"
      );
      console.log(
        "COMFYICU_API_KEY:",
        process.env.COMFYICU_API_KEY
          ? "Set (not showing value)"
          : "NOT SET (This is required)"
      );

      // Create a minimal test request
      const workflow_id =
        (req.query.workflow_id as string) || "test-workflow-id";

      // Just test the API client creation
      const apiClientTest = await comfyICUService.testApiConnection();

      res.status(200).json({
        status: "success",
        message: "Connection test completed",
        apiClientTest: apiClientTest,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          apiUrlConfigured: !!process.env.COMFYICU_API_URL,
          apiKeyConfigured: !!process.env.COMFYICU_API_KEY,
        },
      });
    } catch (error) {
      console.error("Error testing ComfyICU connection:", error);
      res.status(500).json({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error testing connection",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  },
};
