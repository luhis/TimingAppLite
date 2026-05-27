export enum CompetitionStatus {
  Live = "0",
  Scheduled = "1",
  Finalised = "2",
  Provisional = "3",
}

export type Competition = {
  id: string
  active: CompetitionStatus
  name: string
  dateddmmyyyy: string
  provisional: string | null
  finalised: string | null
};

export type LeaderboardSummary = {
  id: string | number
  name: string
};

export type LeaderboardColumn = {
  name: string
  label: string
};

export type LeaderboardItem = Record<string, string | number | null | undefined>;

export type LeaderboardPayload = {
  columns: LeaderboardColumn[]
  items: LeaderboardItem[]
};

export type FilterState = {
  query: string
  driver: string
  className: string
};
