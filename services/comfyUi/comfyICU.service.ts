import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const COMFY_ICU_API_KEY = process.env.COMFYICU_API_KEY;
const BASE_URL = "https://comfy.icu/api/v1/workflows";

export interface RunWorkflowParams {
  workflow_id: string;
  prompt: any;
  files?: Record<string, string>;
  webhook?: string;
  accelerator?: string;
}

export interface RunStatus {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  outputs: any[];
  [key: string]: any;
}

export const comfyICUService = {
  runWorkflow: async (params: RunWorkflowParams): Promise<any> => {
    if (!COMFY_ICU_API_KEY) {
      throw new Error("COMFYICU_API_KEY is not set in environment variables");
    }

    const url = `${BASE_URL}/${params.workflow_id}/runs`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${COMFY_ICU_API_KEY}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to run workflow: ${errorText}`);
    }

    return await response.json();
  },

  getRunStatus: async (
    workflow_id: string,
    run_id: string
  ): Promise<RunStatus> => {
    if (!COMFY_ICU_API_KEY) {
      throw new Error("COMFYICU_API_KEY is not set in environment variables");
    }

    const url = `${BASE_URL}/${workflow_id}/runs/${run_id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${COMFY_ICU_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get run status: ${errorText}`);
    }

    return await response.json();
  },

  runWorkflowAndWaitForCompletion: async (
    params: RunWorkflowParams,
    maxAttempts = 30,
    pollingInterval = 2000
  ): Promise<RunStatus> => {
    // Start the workflow
    const runResponse = await comfyICUService.runWorkflow(params);
    const runId = runResponse.id;

    // Poll for completion
    let attempts = 0;
    while (attempts < maxAttempts) {
      const status = await comfyICUService.getRunStatus(
        params.workflow_id,
        runId
      );

      if (status.status === "COMPLETED") {
        return status;
      } else if (status.status === "ERROR" || status.status === "FAILED") {
        throw new Error(`Workflow run failed: ${JSON.stringify(status)}`);
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollingInterval));
      attempts++;
    }

    throw new Error(
      `Workflow run timed out after ${maxAttempts} polling attempts`
    );
  },
};
