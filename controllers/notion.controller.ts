import { Request, Response } from "express";
import { getContent } from "../utils/notion/getContent";
import { retrieveVacationDaysFromCalendarDatabase } from "../helpers/notion/retrieveDaysFromCalendarDatabase";

export const notionController = {
  getVacationCalendar: async (req: Request, res: Response): Promise<void> => {
    try {
      const notionCalendarId = process.env.NOTION_CALENDAR_ID;

      if (!notionCalendarId) {
        throw new Error("NOTION_CALENDAR_ID is not set");
      }
      const vacations = await getContent(notionCalendarId);
      if (vacations.length === 0) {
        throw new Error("No vacations found");
      }
      const vacationDays = retrieveVacationDaysFromCalendarDatabase(vacations);
      res.status(201).json({ status: "success", vacationDays });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting transcript");
    }
  },
  getPreferredDestinations: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const notionPreferredDestinationsId =
        process.env.NOTION_PREFERRED_DESTINATIONS_ID;
      if (!notionPreferredDestinationsId) {
        throw new Error("NOTION_PREFERRED_DESTINATIONS_ID is not set");
      }
      const preferredDestinations = await getContent(
        notionPreferredDestinationsId
      );
      res.status(201).json({ status: "success", preferredDestinations });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting preferred destinations");
    }
  },
};
