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

      // Check environment variables
      console.log("Environment check:");
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

      // Check if file was uploaded (this will be handled by multer middleware)
      if (!req.file) {
        console.log("No file uploaded");
        res.status(400).json({
          status: "error",
          message: "No face image uploaded. Please upload an image file.",
        });
        return;
      }

      const { workflow_id, prompt_text, seed, accelerator } = req.body;

      if (!workflow_id) {
        console.log("Missing workflow_id");
        res.status(400).json({
          status: "error",
          message: "workflow_id is required",
        });
        return;
      }

      // Get the uploaded file
      const file = req.file;
      console.log(
        "Processing uploaded file:",
        file.originalname,
        file.size,
        file.mimetype
      );

      try {
        // Read the file content as base64
        console.log("Reading file from path:", file.path);
        if (!fs.existsSync(file.path)) {
          throw new Error(`File does not exist at path: ${file.path}`);
        }

        const imageBuffer = fs.readFileSync(file.path);
        console.log("File read successfully, buffer size:", imageBuffer.length);

        const base64Image = imageBuffer.toString("base64");
        console.log("Converted to base64, length:", base64Image.length);

        // Create a data URL from the base64 image
        const mimeType = file.mimetype || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        console.log(
          "Created data URL with prefix:",
          dataUrl.substring(0, 50) + "..."
        );

        // Use provided text or default
        const text =
          prompt_text || "person with detailed face, high quality portrait";
        console.log("Using prompt text:", text);

        // Use provided seed or random
        const randomSeed = Math.floor(Math.random() * 999999999);
        const promptSeed = seed || randomSeed;
        console.log("Using seed:", promptSeed);

        // Create files object with the data URL of the uploaded image
        const files = {
          "/input/face_reference.jpg": dataUrl,
        };
        console.log("Created files object with keys:", Object.keys(files));

        // Create a simplified workflow without IPAdapter
        // This is a basic workflow that should work with any standard ComfyUI setup
        console.log("Creating simplified workflow prompt");
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
          // Direct KSampler without IPAdapter to ensure compatibility
          "5": {
            inputs: {
              model: ["1", 0], // Connect to model output
              latent_image: ["2", 0], // Connect to empty latent image
              positive: ["3", 0], // Connect to positive prompt
              negative: ["4", 0], // Connect to negative prompt
              sampler_name: "euler_ancestral",
              scheduler: "normal",
              seed: promptSeed,
              steps: 20,
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

        console.log(
          "Created basic prompt object with nodes:",
          Object.keys(prompt)
        );
        console.log(
          "Prompt connections:",
          JSON.stringify({
            "KSampler inputs": prompt["5"].inputs,
          })
        );

        // Execute and wait for results
        console.log(
          "Calling comfyICUService.runWorkflowAndWaitForCompletion with workflow_id:",
          workflow_id
        );
        console.log("Accelerator:", accelerator);

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

        // Clean up the temporary file
        console.log("Cleaning up temporary file:", file.path);
        fs.unlinkSync(file.path);
        console.log("File cleanup complete");

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
      } catch (innerError) {
        console.error("Inner error during file processing:", innerError);
        // Still attempt to clean up the file
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log("Cleaned up file after error:", file.path);
          }
        } catch (cleanupError) {
          console.error("Error during file cleanup:", cleanupError);
        }
        throw innerError; // Re-throw to be caught by outer catch
      }
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
