import { newValidDate } from "ts-date";

import {
  type Competition,
  type CompetitionFromApi,
  CompetitionStatus,
} from "../types/leaderboard";

const CompetitionStatusValues: ReadonlySet<string> = new Set<string>(
  Object.values(CompetitionStatus),
);

export const parseDate = (date: string) => {
  return newValidDate(date.replace(/(st|nd|rd|th)/, ""));
};

export const parseCompetitionDate = (
  item: CompetitionFromApi,
): Competition => ({
  ...item,
  dateddmmyyyy: parseDate(item.dateddmmyyyy) || newValidDate(),
});

export const mapCompetitionNode = (node: {
  readonly competitionId?: string | null;
  readonly active?: string | null;
  readonly name?: string | null;
  readonly dateddmmyyyy?: string | null;
  readonly provisional?: string | null;
  readonly finalised?: string | null;
}): Competition => ({
  id: node.competitionId || "",
  active:
    node.active != null && CompetitionStatusValues.has(node.active)
      ? (node.active as CompetitionStatus)
      : CompetitionStatus.Scheduled,
  name: node.name || "",
  dateddmmyyyy: parseDate(node.dateddmmyyyy || "") || newValidDate(),
  provisional: node.provisional || "",
  finalised: node.finalised || "",
});
