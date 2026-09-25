import type { GatsbyNode } from "gatsby";

import { EVENT_COMPETITION_ID, EVENT_LEADERBOARD_ID, fetchAllCompetitions, fetchEventLeaderboard } from "./src/lib/leaderboardApi";
import { retryWithBackoff } from "./src/lib/retryWithBackoff";

const BUILD_FETCH_MAX_RETRIES = 3;
const BUILD_FETCH_BASE_DELAY_MS = 5000;

const fetchWithBuildRetry = async <T>(
  fetchFn: (signal?: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();

  return retryWithBackoff(
    (signal) => fetchFn(signal),
    controller.signal,
    {
      maxRetries: BUILD_FETCH_MAX_RETRIES,
      baseDelayMs: BUILD_FETCH_BASE_DELAY_MS,
    },
  );
};

export const createSchemaCustomization: GatsbyNode["createSchemaCustomization"] =
  ({ actions }) => {
    actions.createTypes(`
      type Competition implements Node @dontInfer {
        id: ID!
        competitionId: String!
        name: String!
        dateddmmyyyy: Date! @dateformat
        active: String!
        provisional: String
        finalised: String
      }

      type EventListColumn {
        name: String!
        label: String!
      }

      type EventListItem {
        name: String
        entries: String
        date: String
      }

      type EventList implements Node @dontInfer {
        id: ID!
        eventId: String!
        columns: [EventListColumn!]!
        items: [EventListItem!]!
      }
    `);
  };


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

  console.log("📡 Fetching competitions and event list…");

  const [compResult, eventResult] = await Promise.allSettled([
    fetchWithBuildRetry(fetchAllCompetitions),
    fetchWithBuildRetry(fetchEventLeaderboard),
  ]);

  if (compResult.status === "fulfilled") {
    console.log(`✅ Fetched ${compResult.value.length} competitions`);

    compResult.value.forEach((competition) => {
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
  } else {
    console.error("❌ Error fetching competitions:", compResult.reason);
  }

  if (eventResult.status === "fulfilled") {
    console.log(`✅ Fetched ${eventResult.value.items.length} events`);

    void createNode({
      eventId: `${EVENT_COMPETITION_ID}-${EVENT_LEADERBOARD_ID}`,
      columns: eventResult.value.columns,
      items: eventResult.value.items,
      id: createNodeId(`EventList-${EVENT_COMPETITION_ID}-${EVENT_LEADERBOARD_ID}`),
      parent: null,
      children: [],
      internal: {
        type: "EventList",
        contentDigest: createContentDigest(eventResult.value),
      },
    });
  } else {
    console.error("❌ Error fetching event list:", eventResult.reason);
  }
};
