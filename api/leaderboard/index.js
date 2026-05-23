const REMOTE_API_BASE = "https://autotest.sapphire-solutions.co.uk/API/1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const jsonResponse = (status, body) => ({
  status,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

const proxyJson = async (url) => {
  const upstream = await fetch(url);
  const text = await upstream.text();

  return {
    status: upstream.status,
    headers: corsHeaders,
    body: text,
  };
};

module.exports = async function leaderboardApi(context, req) {
  if (req.method === "OPTIONS") {
    return {
      status: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  const endpoint = String(req.query.endpoint || "");

  try {
    if (endpoint === "live-competitions") {
      return await proxyJson(`${REMOTE_API_BASE}/LiveAllCompetitions/`);
    }

    if (endpoint === "leaderboards") {
      const competitionId = String(req.query.competitionId || "");

      if (!competitionId) {
        return jsonResponse(400, { error: "Missing competitionId" });
      }

      return await proxyJson(`${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/`);
    }

    if (endpoint === "leaderboard") {
      const competitionId = String(req.query.competitionId || "");
      const leaderboardId = String(req.query.leaderboardId || "");

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
