import { CompetitionStatus } from "../types/leaderboard";

export const competitionStatusLabel = (
  status: CompetitionStatus | undefined,
): string => {
  switch (status) {
    case CompetitionStatus.Live:
      return "Live";
    case CompetitionStatus.Scheduled:
      return "Scheduled";
    case CompetitionStatus.Finalised:
      return "Finalised";
    case CompetitionStatus.Provisional:
      return "Provisional";
    case undefined:
    default:
      return "Open";
  }
};

export const competitionStatusColor = (
  status: CompetitionStatus | undefined,
): string => {
  switch (status) {
    case CompetitionStatus.Live:
      return "success";
    case CompetitionStatus.Scheduled:
      return "warning";
    case CompetitionStatus.Finalised:
      return "info";
    case CompetitionStatus.Provisional:
    case undefined:
    default:
      return "light";
  }
};
