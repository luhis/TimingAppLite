import type { Competition, LeaderboardPayload, LeaderboardSummary } from "../types/leaderboard";

const API_BASE = "/api/leaderboard";

const getJson = async <T>(url: string, errorPrefix: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`${errorPrefix} (${response.status})`);
  }

  return (await response.json()) as T;
};

export const fetchCompetitions = async (signal?: AbortSignal) =>
  getJson<Competition[]>(`${API_BASE}?endpoint=live-competitions`, "Unable to load competitions", signal);

export const fetchLeaderboards = async (competitionId: string, signal?: AbortSignal) =>
  getJson<LeaderboardSummary[]>(
    `${API_BASE}?endpoint=leaderboards&competitionId=${encodeURIComponent(competitionId)}`,
    "Unable to load leaderboard list",
    signal
  );

export const fetchLeaderboard = async (competitionId: string, leaderboardId: string, signal?: AbortSignal) =>
  getJson<LeaderboardPayload>(
    `${API_BASE}?endpoint=leaderboard&competitionId=${encodeURIComponent(competitionId)}&leaderboardId=${encodeURIComponent(leaderboardId)}`,
    "Unable to load results",
    signal
  );
