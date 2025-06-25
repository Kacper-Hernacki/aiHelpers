import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import configureRoutes from "./routes/index";

// Load environment variables
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
console.log(`Loading environment from ${envFile}`);
dotenv.config({ path: envFile });

// Fallback to .env if specific env file not found
if (!process.env.PORT) {
  console.log("Specific env file not found or missing PORT, loading from .env");
  dotenv.config();
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory at: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadsDir));

// Configure all routes
configureRoutes(app);

// Root route
app.get("/", (req, res) => {
  res.send({
    status: "success",
    message: "aiHelpers API is running",
    env: process.env.NODE_ENV || "development",
    uploadsDirExists: fs.existsSync(uploadsDir),
    comfyIcuConfigured: !!process.env.COMFYICU_API_KEY,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡️ Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log(
    `ComfyICU API URL: ${
      process.env.COMFYICU_API_URL || "Not set (using default)"
    }`
  );
  console.log(
    `ComfyICU API Key: ${
      process.env.COMFYICU_API_KEY
        ? "Set (not shown)"
        : "NOT SET (this is required)"
    }`
  );
});
