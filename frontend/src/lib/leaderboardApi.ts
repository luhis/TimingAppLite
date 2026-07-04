import type {
  CompetitionFromApi,
  LeaderboardPayloadFromApi,
  LeaderboardSummary,
} from "../types/leaderboard";

const API_BASE = (process.env.GATSBY_BACKEND_URL ?? "") + "/API/1";

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getJson = async <T>(
  url: string,
  errorPrefix: string,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`${errorPrefix} (${response.status})`);
  }

  return (await response.json()) as T;
};

export const fetchAllCompetitions = async (
  signal?: AbortSignal,
): Promise<readonly CompetitionFromApi[]> =>
  getJson<readonly CompetitionFromApi[]>(
    `${API_BASE}/LiveAllCompetitions`,
    "Unable to load competitions",
    signal,
  );

export const fetchLeaderboards = async (
  competitionId: string,
  signal?: AbortSignal,
): Promise<readonly LeaderboardSummary[]> =>
  getJson<readonly LeaderboardSummary[]>(
    `${API_BASE}/Competitions/${encodeURIComponent(competitionId)}/LeaderBoards/`,
    "Unable to load leaderboard list",
    signal,
  );

export const fetchLeaderboard = async (
  competitionId: string,
  leaderboardId: string,
  signal?: AbortSignal,
): Promise<LeaderboardPayloadFromApi> =>
  getJson<LeaderboardPayloadFromApi>(
    `${API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/${encodeURIComponent(leaderboardId)}`,
    "Unable to load results",
    signal,
  );

// Well-known event competition/leaderboard IDs for the event list feed
export const EVENT_COMPETITION_ID = "1435";
export const EVENT_LEADERBOARD_ID = "99999";

export const fetchEventLeaderboard = async (
  signal?: AbortSignal,
): Promise<LeaderboardPayloadFromApi> =>
  getJson<LeaderboardPayloadFromApi>(
    `${API_BASE}/Competitions/${EVENT_COMPETITION_ID}/Leaderboards/${EVENT_LEADERBOARD_ID}`,
    "Unable to load event list",
    signal,
  );
