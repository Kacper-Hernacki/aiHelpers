import { Response } from "express";

interface FlightResult {
  best_flights: Array<{
    flights: Array<{
      departure: {
        airport: string;
        time: string;
        code: string;
      };
      arrival: {
        airport: string;
        time: string;
        code: string;
      };
      duration: string;
      airline: {
        name: string;
        logo: string;
        flight_number: string;
      };
      aircraft: string;
      travel_class: string;
    }>;
    price: number;
    emissions: number;
    bookingToken: string;
  }>;
  priceSummary: any;
}

export function transformFlightData(rawData: any): FlightResult {
  return {
    best_flights: rawData.best_flights?.map((itinerary: any) => ({
      flights: itinerary.flights.map((leg: any) => ({
        departure: {
          airport: leg.departure_airport.name,
          time: leg.departure_airport.time,
          code: leg.departure_airport.id,
        },
        arrival: {
          airport: leg.arrival_airport.name,
          time: leg.arrival_airport.time,
          code: leg.arrival_airport.id,
        },
        duration: leg.duration,
        airline: {
          name: leg.airline,
          logo: leg.airline_logo,
          flight_number: leg.flight_number,
        },
        aircraft: leg.airplane,
        travel_class: leg.travel_class,
      })),
      price: itinerary.price,
      emissions: itinerary.carbon_emissions,
      bookingToken: itinerary.booking_token,
    })),
    priceSummary: rawData.price_insights,
  };
}

export function handleApiError(error: unknown, res: Response) {
  if (error instanceof Error) {
    const serpError = error as { code?: number; message: string };

    switch (serpError.code) {
      case 400:
        res.status(400).json({
          error: "Invalid request parameters",
          details: serpError.message,
        });
        break;
      case 401:
        res.status(401).json({
          error: "Invalid SerpAPI credentials",
          solution: "Verify SERPAPI_KEY environment variable",
        });
        break;
      case 429:
        res.status(429).json({
          error: "API rate limit exceeded",
          solution: "Upgrade SerpAPI plan or implement request throttling",
        });
        break;
      default:
        res.status(500).json({
          error: "Flight search failed",
          details: serpError.message,
        });
    }
  } else {
    res.status(500).json({
      error: "Unknown error occurred during flight search",
    });
  }
}
