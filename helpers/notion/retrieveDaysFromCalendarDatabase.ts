export const retrieveVacationDaysFromCalendarDatabase = (vacations: any) => {
  const vacationDays = vacations.map((vacation: any) => {
    const dateProperty = vacation.properties.Date.date;
    return {
      start: dateProperty.start,
      end: dateProperty.end,
    };
  });
  return vacationDays;
};
