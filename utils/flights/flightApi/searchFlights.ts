import axios from "axios";
import { Request, Response, NextFunction } from "express";

interface FlightRequest {
  departure: string;
  arrival: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: "Economy" | "Business" | "Premium_Economy" | "First";
  currency: string;
}

interface FlightResponse {
  itineraries: Array<{
    id: string;
    legs: Array<{
      segments: Array<{
        departure: string;
        arrival: string;
        duration: number;
        carrier: string;
      }>;
    }>;
    price: {
      amount: number;
      currency: string;
    };
  }>;
}

const BASE_URL = "https://api.flightapi.io/onewaytrip";

export async function searchFlights(
  params: FlightRequest
): Promise<FlightResponse> {
  try {
    const url = `${BASE_URL}/${process.env.FLIGHT_API_KEY}/${params.departure}/${params.arrival}/${params.date}/${params.adults}/${params.children}/${params.infants}/${params.cabinClass}/${params.currency}`;

    const response = await axios.get<FlightResponse>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `FlightAPI Error: ${error.response?.status} - ${error.message}`
      );
    }
    throw new Error("Unexpected error occurred");
  }
}

export function validateFlightParams(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { departure, arrival, date } = req.query;

  if (!departure || !arrival || !date) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date as string)) {
    return res.status(400).json({ error: "Invalid date format (YYYY-MM-DD)" });
  }

  next();
}
