import { newValidDate } from "ts-date";
import { Competition, CompetitionFromApi } from "../types/leaderboard";

export const parseDate = (date: string) => {
  return newValidDate(date.replace(/(st|nd|rd|th)/, ""));
};

export const parseCompetitionDate = (
  item: CompetitionFromApi,
): Competition => ({
  ...item,
  dateddmmyyyy: parseDate(item.dateddmmyyyy) || newValidDate(),
});
