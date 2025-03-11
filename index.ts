import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import apiKeyAuth from "./middleware/apiKeyAuth";
import cors from "cors";
import applyRoutes from "./routes";

dotenv.config();

const app = express();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.use(bodyParser.json());
app.use(cors());

// app.use(apiKeyAuth);

applyRoutes(app);

app.get("/", async (req: Request, res: Response) => {
  try {
    res.send(`👋 Hello from aiHelpers!`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error while connecting to the database");
  }
});

app.listen(port, "0.0.0.0", async () => {
  console.log(`Example app listening at http://0.0.0.0:${port}`);
});
