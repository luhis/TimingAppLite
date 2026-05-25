import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from "gatsby";
import { proxyLeaderboardRequest } from "../../api/leaderboard/shared/apiBits";

export default async function handler(request: GatsbyFunctionRequest, response: GatsbyFunctionResponse) {
  const proxyResponse = await proxyLeaderboardRequest({
    method: request.method,
    query: request.query,
    fetchImpl: fetch,
  });

  Object.entries(proxyResponse.headers).forEach(([headerName, headerValue]) => {
    response.setHeader(headerName, headerValue);
  });

  response.status(proxyResponse.status).send(proxyResponse.body);
}