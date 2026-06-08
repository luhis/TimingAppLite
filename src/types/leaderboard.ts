type Override<T, U> = Omit<T, keyof U> & U;

export enum CompetitionStatus {
  Live = "0",
  Scheduled = "1",
  Finalised = "2",
  Provisional = "3",
}

export type Competition = {
  readonly id: string;
  readonly active: CompetitionStatus;
  readonly name: string;
  readonly dateddmmyyyy: string;
  readonly provisional: string | null;
  readonly finalised: string | null;
};

export type LeaderboardSummary = {
  readonly id: string | number;
  readonly name: string;
};

export type LeaderboardColumn = {
  readonly name: string;
  readonly label: string;
};

export type LeaderboardItem = LeaderboardItemFromApi & {
  readonly _index: number;
};

export type LeaderboardItemFromApi = {
  readonly classname: string;
} & Record<string, string | number | undefined>;

export type LeaderboardPayload = Override<
  LeaderboardPayloadFromApi,
  {
    readonly items: readonly LeaderboardItem[];
  }
>;

export type LeaderboardPayloadFromApi = {
  readonly columns: readonly LeaderboardColumn[];
  readonly items: readonly LeaderboardItemFromApi[];
};

export type FilterState = {
  readonly query: string;
  readonly driver: string;
  readonly className: string;
};
