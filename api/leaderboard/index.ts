import { REMOTE_API_BASE } from "../../src/shared/apiBits";

type FunctionResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

type HttpRequest = {
  method?: string;
  query?: Record<string, unknown>;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const jsonResponse = (status: number, body: unknown): FunctionResponse => ({
  status,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

const proxyJson = async (url: string): Promise<FunctionResponse> => {
  const upstream = await fetch(url);
  const text = await upstream.text();

  return {
    status: upstream.status,
    headers: corsHeaders,
    body: text,
  };
};

module.exports = async function leaderboardApi(_context: unknown, req: HttpRequest): Promise<FunctionResponse> {
  if (req.method === "OPTIONS") {
    return {
      status: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  const query = req.query ?? {};
  const endpoint = String(query.endpoint ?? "");

  try {
    if (endpoint === "live-competitions") {
      return await proxyJson(`${REMOTE_API_BASE}/LiveAllCompetitions/`);
    }

    if (endpoint === "leaderboards") {
      const competitionId = String(query.competitionId ?? "");

      if (!competitionId) {
        return jsonResponse(400, { error: "Missing competitionId" });
      }

      return await proxyJson(`${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/`);
    }

    if (endpoint === "leaderboard") {
      const competitionId = String(query.competitionId ?? "");
      const leaderboardId = String(query.leaderboardId ?? "");

      if (!competitionId || !leaderboardId) {
        return jsonResponse(400, { error: "Missing competitionId or leaderboardId" });
      }

      return await proxyJson(
        `${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/${encodeURIComponent(leaderboardId)}`
      );
    }

    return jsonResponse(404, { error: "Unknown endpoint" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    return jsonResponse(502, { error: message });
  }
};
