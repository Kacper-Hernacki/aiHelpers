import express from "express";
import { flightsController } from "../controllers/flights.controller";

const router = express.Router();

router.get("/search", flightsController.getFlightsWithFlightApi);
router.get("/search/serp", flightsController.getFlightsWithSerpApi);

export default router;
