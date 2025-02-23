import { createWorker } from "tesseract.js";

export async function extractTextFromImage(imageBuffer: Buffer) {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
