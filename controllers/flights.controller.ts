import { Request, Response } from "express";
import { searchFlights } from "../utils/flights/flightApi/searchFlights";
import { getJson } from "serpapi";
import {
  handleApiError,
  transformFlightData,
} from "../utils/flights/serpApi/serpApiHelpers";
import axios from "axios";

export const flightsController = {
  getFlightsWithFlightApi: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const params = {
        departure: req.query.departure as string,
        arrival: req.query.arrival as string,
        date: req.query.date as string,
        adults: parseInt(req.query.adults as string) || 1,
        children: parseInt(req.query.children as string) || 0,
        infants: parseInt(req.query.infants as string) || 0,
        cabinClass: (req.query.cabinClass as "Economy") || "Economy",
        currency: (req.query.currency as string) || "USD",
      };
      console.log(params);
      const response = await searchFlights(params);

      res.status(201).json({ status: "success", response });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting transcript");
    }
  },
  getFlightsWithSerpApi: async (req: Request, res: Response): Promise<void> => {
    const { arrival_id, outbound_date, return_date } = req.query;
    console.log(arrival_id, outbound_date, return_date);
    if (!arrival_id || !outbound_date) {
      res.status(400).json({
        error: "Missing required parameters",
        required: ["arrival_id", "outbound_date", "return_date"],
      });
      return;
    }

    try {
      const params = {
        engine: "google_flights",
        api_key: process.env.SERPAPI_KEY,
        departure_id: "WAW",
        arrival_id: arrival_id as string,
        outbound_date: outbound_date as string,
        return_date: return_date as string,
        currency: "USD",
        hl: "en",
      };
      const response = await axios.get("https://serpapi.com/search", {
        params,
      });
      console.log("RESULT", response.data);
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res);
    }
  },
};
