import { Express } from "express";
import youtubeRoutes from "./youtube.routes.ts";
import notesRoutes from "./notes.routes.ts";
import linkedinRoutes from "./linkedin.routes.ts";
import flightsRoutes from "./flights.routes.ts";
import notionRoutes from "./notion.routes.ts";
import comfyICURoutes from "./comfyICU.routes.ts";
import fileUploadRoutes from "./fileUpload.routes.ts";
import imageAnalysisRoutes from "./imageAnalysis.routes.ts";
import templateGeneratorRoutes from "./templateGenerator.routes.ts";
import pdfEmbeddingRoutes from "./pdfEmbedding.routes.ts";
import hybridRAGRoutes from "./hybridRAG.routes.ts";

export default (app: Express) => {
  app.use("/youtube", youtubeRoutes);
  app.use("/notes", notesRoutes);
  app.use("/linkedin", linkedinRoutes);
  app.use("/flights", flightsRoutes);
  app.use("/notion", notionRoutes);
  app.use("/comfyicu", comfyICURoutes);
  app.use("/file", fileUploadRoutes);
  app.use("/image", imageAnalysisRoutes);
  app.use("/template", templateGeneratorRoutes);
  app.use("/pdf", pdfEmbeddingRoutes);
  app.use("/hybrid", hybridRAGRoutes);
};
