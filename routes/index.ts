import { Express } from "express";
import youtubeRoutes from "./youtube.routes";
import notesRoutes from "./notes.routes";
import linkedinRoutes from "./linkedin.routes";
import flightsRoutes from "./flights.routes";
import notionRoutes from "./notion.routes";
import comfyICURoutes from "./comfyICU.routes";
import fileUploadRoutes from "./fileUpload.routes";
import imageAnalysisRoutes from "./imageAnalysis.routes";
import templateGeneratorRoutes from "./templateGenerator.routes";
import pdfEmbeddingRoutes from "./pdfEmbedding.routes";
import hybridRAGRoutes from "./hybridRAG.routes";

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
