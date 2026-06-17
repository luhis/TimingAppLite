import type { GatsbyNode } from "gatsby";

import type { CompetitionFromApi } from "./src/types/leaderboard";

const API_BASE = process.env.GATSBY_BACKEND_URL
  ? `${process.env.GATSBY_BACKEND_URL}/API/1`
  : "";

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({
  actions,
  createNodeId,
  createContentDigest,
}) => {
  const { createNode } = actions;

  if (!API_BASE) {
    console.warn(
      "⚠️  GATSBY_BACKEND_URL is not set. Skipping competition data fetch.",
    );
    console.warn(
      "   Set GATSBY_BACKEND_URL in your environment or .env file.",
    );
    return;
  }

  console.log(`📡 Fetching competitions from: ${API_BASE}/LiveAllCompetitions`);

  try {
    const response = await fetch(`${API_BASE}/LiveAllCompetitions`);

    if (!response.ok) {
      console.error(`❌ Failed to fetch competitions: ${response.status}`);
      return;
    }

    const competitions =
      (await response.json()) as readonly CompetitionFromApi[];

    console.log(`✅ Fetched ${competitions.length} competitions`);

    competitions.forEach((competition) => {
      void createNode({
        ...competition,
        competitionId: competition.id, // Preserve original ID for reference
        id: createNodeId(`Competition-${competition.id}`),
        parent: null,
        children: [],
        internal: {
          type: "Competition",
          contentDigest: createContentDigest(competition),
        },
      });
    });
  } catch (error) {
    console.error("❌ Error fetching competitions:", error);
  }
};
