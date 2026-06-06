import { newValidDate } from "ts-date";

export const parseDate = (date: string) => {
  return newValidDate(date.replace(/(st|nd|rd|th)/, ""));
};
