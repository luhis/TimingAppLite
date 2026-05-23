import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from "gatsby";

const REMOTE_API_BASE = "https://autotest.sapphire-solutions.co.uk/API/1";

const allowCors = (response: GatsbyFunctionResponse) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
};

const proxyJson = async (url: string, response: GatsbyFunctionResponse) => {
  const upstream = await fetch(url);

  response.status(upstream.status);
  allowCors(response);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.send(await upstream.text());
};

export default async function handler(request: GatsbyFunctionRequest, response: GatsbyFunctionResponse) {
  allowCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  console.log(`Received request for endpoint: ${request.query.endpoint}`);

  const endpoint = String(request.query.endpoint ?? "");

  try {
    if (endpoint === "live-competitions") {
      await proxyJson(`${REMOTE_API_BASE}/LiveAllCompetitions/`, response);
      return;
    }

    if (endpoint === "leaderboards") {
      const competitionId = String(request.query.competitionId ?? "");

      if (!competitionId) {
        response.status(400).json({ error: "Missing competitionId" });
        return;
      }

      await proxyJson(`${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/`, response);
      return;
    }

    if (endpoint === "leaderboard") {
      const competitionId = String(request.query.competitionId ?? "");
      const leaderboardId = String(request.query.leaderboardId ?? "");

      if (!competitionId || !leaderboardId) {
        response.status(400).json({ error: "Missing competitionId or leaderboardId" });
        return;
      }

      await proxyJson(
        `${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/${encodeURIComponent(leaderboardId)}`,
        response
      );
      return;
    }

    response.status(404).json({ error: "Unknown endpoint" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    response.status(502).json({ error: message });
  }
}