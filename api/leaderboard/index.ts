import { proxyLeaderboardRequest } from "./shared/apiBits";

type HttpRequest = {
  method?: string;
  query?: Record<string, unknown>;
};

module.exports = async function leaderboardApi(_context: unknown, req: HttpRequest) {
  return await proxyLeaderboardRequest({
    method: req.method,
    query: req.query ?? {},
    fetchImpl: fetch,
  });
};
