import type { Competition, LeaderboardPayload, LeaderboardSummary } from "../types/leaderboard";

const API_BASE = (process.env.GATSBY_SIGNALR_HUB_URL ?? "") +  "/API/1";

const getJson = async <T>(url: string, errorPrefix: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`${errorPrefix} (${response.status})`);
  }

  return (await response.json()) as T;
};

export const fetchAllCompetitions = async (signal?: AbortSignal) =>
  getJson<readonly Competition[]>(`${API_BASE}/LiveAllCompetitions`, "Unable to load competitions", signal);

export const fetchLeaderboards = async (competitionId: string, signal?: AbortSignal) =>
  getJson<readonly LeaderboardSummary[]>(
    `${API_BASE}/Competitions/${encodeURIComponent(competitionId)}/LeaderBoards/`,
    "Unable to load leaderboard list",
    signal
  );

export const fetchLeaderboard = async (competitionId: string, leaderboardId: string, signal?: AbortSignal) =>
  getJson<LeaderboardPayload>(
    `${API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/${encodeURIComponent(leaderboardId)}`,
    "Unable to load results",
    signal
  );
