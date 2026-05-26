
const REMOTE_API_BASE = "https://autotest.sapphire-solutions.co.uk/API/1";

type ProxyResponse = {
	status: number;
	headers: Record<string, string>;
	body: string;
};

type ProxyRequestArgs = Readonly<{
	method: string | undefined;
	query: Readonly<Record<string, unknown>>;
	fetchImpl: (input: string) => Promise<{ status: number; text: () => Promise<string> }>;
}>;

const jsonHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Allow-Methods": "GET,OPTIONS",
	"Content-Type": "application/json; charset=utf-8",
};

const optionsHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Allow-Methods": "GET,OPTIONS",
};

const toValue = (input: unknown) => {
	if (typeof input === "string") {
		return input;
	}

	if (typeof input === "number" || typeof input === "boolean" || typeof input === "bigint") {
		return String(input);
	}

	return "";
};

const jsonResponse = (status: number, body: unknown): ProxyResponse => ({
	status,
	headers: jsonHeaders,
	body: JSON.stringify(body),
});

const proxyJson = async (
	url: string,
	fetchImpl: ProxyRequestArgs["fetchImpl"]
): Promise<ProxyResponse> => {
	const upstream = await fetchImpl(url);
	const text = await upstream.text();

	return {
		status: upstream.status,
		headers: jsonHeaders,
		body: text,
	};
};

export const proxyLeaderboardRequest = async ({
	method,
	query,
	fetchImpl,
}: ProxyRequestArgs): Promise<ProxyResponse> => {
	if (method === "OPTIONS") {
		return {
			status: 204,
			headers: optionsHeaders,
			body: "",
		};
	}

	const endpoint = toValue(query.endpoint);

	try {
		if (endpoint === "live-competitions") {
			return await proxyJson(`${REMOTE_API_BASE}/LiveAllCompetitions/`, fetchImpl);
		}

		if (endpoint === "leaderboards") {
			const competitionId = toValue(query.competitionId);

			if (!competitionId) {
				return jsonResponse(400, { error: "Missing competitionId" });
			}

			return await proxyJson(
				`${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/`,
				fetchImpl
			);
		}

		if (endpoint === "leaderboard") {
			const competitionId = toValue(query.competitionId);
			const leaderboardId = toValue(query.leaderboardId);

			if (!competitionId || !leaderboardId) {
				return jsonResponse(400, { error: "Missing competitionId or leaderboardId" });
			}

			return await proxyJson(
				`${REMOTE_API_BASE}/Competitions/${encodeURIComponent(competitionId)}/Leaderboards/${encodeURIComponent(leaderboardId)}`,
				fetchImpl
			);
		}

		return jsonResponse(404, { error: "Unknown endpoint" });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Proxy request failed";
		return jsonResponse(502, { error: message });
	}
};
