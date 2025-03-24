import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// ComfyICU API base URL and API key from environment variables
const COMFYICU_API_URL =
  process.env.COMFYICU_API_URL || "https://api.comfyui.net";
const COMFYICU_API_KEY = process.env.COMFYICU_API_KEY;

// Helper to create axios instance with authentication headers
const createApiClient = () => {
  console.log("Creating API client for:", COMFYICU_API_URL);
  if (!COMFYICU_API_KEY) {
    console.error("COMFYICU_API_KEY is not set in environment variables");
    throw new Error("ComfyICU API key is not configured");
  }

  return axios.create({
    baseURL: COMFYICU_API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${COMFYICU_API_KEY}`,
    },
  });
};

export const comfyICUService = {
  // Test API connection
  testApiConnection: async () => {
    try {
      console.log("Testing ComfyICU API connection");
      const apiClient = createApiClient();

      // Just create the client and return connection info without making an actual API call
      return {
        success: true,
        baseURL: apiClient.defaults.baseURL,
        headersPresent: !!apiClient.defaults.headers,
        message: "API client created successfully",
      };
    } catch (error) {
      console.error("Failed to create API client:", error);
      throw error;
    }
  },

  // Run a workflow with the provided prompt
  runWorkflow: async ({
    workflow_id,
    prompt,
    files = {},
    webhook = null,
    accelerator = null,
  }: {
    workflow_id: string;
    prompt: any;
    files?: any;
    webhook?: string | null;
    accelerator?: string | null;
  }) => {
    try {
      console.log(`Running workflow: ${workflow_id}`);
      console.log(
        "With prompt:",
        JSON.stringify(prompt).substring(0, 200) + "..."
      );
      console.log("Files:", Object.keys(files));
      console.log("Webhook:", webhook);
      console.log("Accelerator:", accelerator);

      const apiClient = createApiClient();
      const payload: any = {
        prompt,
        files,
      };

      if (webhook) {
        payload.webhook = webhook;
      }

      if (accelerator) {
        payload.accelerator = accelerator;
      }

      // Log the exact URL and partial payload being sent
      const requestUrl = `/workflows/${workflow_id}/runs`;
      console.log(`Sending request to ${COMFYICU_API_URL}${requestUrl}`);
      console.log(
        "Request payload sample:",
        JSON.stringify(payload).substring(0, 500) + "..."
      );

      // Log any missing connections in KSampler nodes
      if (prompt && Object.keys(prompt).length > 0) {
        Object.keys(prompt).forEach((nodeId) => {
          const node = prompt[nodeId];
          if (node.class_type === "KSampler") {
            console.log(`Checking KSampler node ${nodeId} connections:`);
            const requiredInputs = [
              "model",
              "latent_image",
              "positive",
              "negative",
            ];
            requiredInputs.forEach((input) => {
              if (!node.inputs[input]) {
                console.warn(
                  `⚠️ KSampler node ${nodeId} is missing required input: ${input}`
                );
              } else {
                console.log(
                  `✓ KSampler node ${nodeId} has input ${input}: ${JSON.stringify(node.inputs[input])}`
                );
              }
            });
          }
        });
      }

      const response = await apiClient.post(requestUrl, payload);

      console.log(
        "Workflow run response:",
        response.status,
        response.statusText
      );
      console.log(
        "Response data:",
        JSON.stringify(response.data).substring(0, 200) + "..."
      );

      return response.data;
    } catch (error) {
      console.error("Error in comfyICUService.runWorkflow:");
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.message);
        console.error("Response status:", error.response?.status);
        console.error("Response data:", error.response?.data);

        // If there's a validation error, log more details
        if (
          error.response?.data?.error?.type ===
          "prompt_outputs_failed_validation"
        ) {
          console.error(
            "Validation Error Details:",
            JSON.stringify(error.response.data, null, 2)
          );
          console.error("Node errors:", error.response.data.node_errors);
        }
      } else {
        console.error("Non-Axios error:", error);
      }
      throw error;
    }
  },

  // Get the status of a workflow run
  getRunStatus: async (workflow_id: string, run_id: string) => {
    try {
      console.log(
        `Getting run status for workflow: ${workflow_id}, run: ${run_id}`
      );
      const apiClient = createApiClient();
      const response = await apiClient.get(
        `/workflows/${workflow_id}/runs/${run_id}`
      );
      console.log("Run status response:", response.status, response.statusText);
      return response.data;
    } catch (error) {
      console.error("Error in comfyICUService.getRunStatus:");
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.message);
        console.error("Response status:", error.response?.status);
        console.error("Response data:", error.response?.data);
      } else {
        console.error("Non-Axios error:", error);
      }
      throw error;
    }
  },

  // Run workflow and poll until completion
  runWorkflowAndWaitForCompletion: async ({
    workflow_id,
    prompt,
    files = {},
    webhook = null,
    accelerator = null,
    maxAttempts = 30, // Max polling attempts
    pollingInterval = 2000, // Polling interval in ms
  }: {
    workflow_id: string;
    prompt: any;
    files?: any;
    webhook?: string | null;
    accelerator?: string | null;
    maxAttempts?: number;
    pollingInterval?: number;
  }) => {
    try {
      console.log("Starting runWorkflowAndWaitForCompletion");
      console.log("Full workflow_id:", workflow_id);
      console.log(
        "Full API URL:",
        `${COMFYICU_API_URL}/workflows/${workflow_id}/runs`
      );

      // Verify we have all required pieces
      if (!workflow_id) {
        throw new Error("workflow_id is required");
      }

      if (!prompt || typeof prompt !== "object") {
        throw new Error("prompt must be a valid object");
      }

      // Start the workflow run
      const runResponse = await comfyICUService.runWorkflow({
        workflow_id,
        prompt,
        files,
        webhook,
        accelerator,
      });

      console.log(
        "Initial run response:",
        JSON.stringify(runResponse).substring(0, 200) + "..."
      );

      if (!runResponse || !runResponse.id) {
        console.error("Invalid run response:", runResponse);
        throw new Error("Failed to start workflow run");
      }

      const runId = runResponse.id;
      console.log(`Workflow run started with ID: ${runId}`);

      // Wait a moment before starting to poll
      console.log(
        `Initial delay of ${pollingInterval}ms before first polling...`
      );
      await new Promise((resolve) => setTimeout(resolve, pollingInterval));

      // Poll for completion
      let attempts = 0;
      let status = null;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts}`);

        try {
          // Get current status
          status = await comfyICUService.getRunStatus(workflow_id, runId);
          console.log(`Current status: ${JSON.stringify(status)}`);

          // Different APIs might use different status field names (state vs status)
          const statusValue = status.state || status.status || "unknown";
          console.log(`Current status value: ${statusValue}`);

          // Check if completed or failed - handle different API response formats
          if (statusValue === "completed" || statusValue === "COMPLETED") {
            console.log("Workflow completed successfully!");
            return status;
          } else if (
            statusValue === "failed" ||
            statusValue === "error" ||
            statusValue === "ERROR" ||
            statusValue === "FAILED"
          ) {
            console.error("Workflow failed:", status.error || "Unknown error");
            throw new Error(
              `Workflow run failed: ${status.error || "Unknown error"}`
            );
          }

          // If we're here, the workflow is still running
          console.log(`Workflow is still processing. Status: ${statusValue}`);
        } catch (pollingError) {
          console.error(
            `Error during polling attempt ${attempts}:`,
            pollingError
          );
          // Continue polling despite errors - the job might still be running
        }

        // Wait before next polling
        console.log(`Waiting ${pollingInterval}ms before next polling...`);
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      }

      throw new Error(
        `Workflow execution timed out after ${maxAttempts} polling attempts`
      );
    } catch (error) {
      console.error("Error in runWorkflowAndWaitForCompletion:");
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.message);
        console.error("Response status:", error.response?.status);
        console.error(
          "Response data:",
          JSON.stringify(error.response?.data, null, 2)
        );

        if (error.response?.data?.detail) {
          console.error("API error detail:", error.response.data.detail);
        }
      } else {
        console.error("Non-Axios error:", error);
      }
      throw error;
    }
  },
};
