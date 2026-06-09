import type { GatsbyNode } from "gatsby";
import type { CompetitionFromApi } from "./src/types/leaderboard";

const API_BASE = (process.env.GATSBY_BACKEND_URL ?? "") + "/API/1";

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({
  actions,
  createNodeId,
  createContentDigest,
}) => {
  const { createNode } = actions;

  try {
    const response = await fetch(`${API_BASE}/LiveAllCompetitions`);
    
    if (!response.ok) {
      console.error(`Failed to fetch competitions: ${response.status}`);
      return;
    }

    const competitions = (await response.json()) as readonly CompetitionFromApi[];

    competitions.forEach((competition) => {
      createNode({
        ...competition,
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
    console.error("Error fetching competitions:", error);
  }
};
