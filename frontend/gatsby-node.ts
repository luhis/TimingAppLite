import type { GatsbyNode } from "gatsby";

import { EVENT_COMPETITION_ID, EVENT_LEADERBOARD_ID, fetchAllCompetitions, fetchEventLeaderboard  } from "./src/lib/leaderboardApi";


export const sourceNodes: GatsbyNode["sourceNodes"] = async ({
  actions,
  createNodeId,
  createContentDigest,
}) => {
  const { createNode } = actions;

  if (!process.env.GATSBY_BACKEND_URL) {
    console.warn(
      "⚠️  GATSBY_BACKEND_URL is not set. Skipping competition data fetch.",
    );
    console.warn(
      "   Set GATSBY_BACKEND_URL in your environment or .env file.",
    );
    return;
  }

  try {
    console.log("📡 Fetching competitions…");
    const competitions = await fetchAllCompetitions();
    console.log(`✅ Fetched ${competitions.length} competitions`);

    competitions.forEach((competition) => {
      void createNode({
        ...competition,
        competitionId: competition.id,
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

  try {
    console.log("📡 Fetching event list…");
    const payload = await fetchEventLeaderboard();
    console.log(`✅ Fetched ${payload.items.length} events`);

    void createNode({
      eventId: `${EVENT_COMPETITION_ID}-${EVENT_LEADERBOARD_ID}`,
      columns: payload.columns,
      items: payload.items,
      id: createNodeId(`EventList-${EVENT_COMPETITION_ID}-${EVENT_LEADERBOARD_ID}`),
      parent: null,
      children: [],
      internal: {
        type: "EventList",
        contentDigest: createContentDigest(payload),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching event list:", error);
  }
};
