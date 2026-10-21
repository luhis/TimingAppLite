import type { GatsbyNode } from "gatsby";

import {
  EVENT_COMPETITION_ID,
  EVENT_LEADERBOARD_ID,
  fetchAllCompetitions,
  fetchEventLeaderboard,
} from "./src/lib/leaderboardApi";
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

const normalizeCompetitionNode = (competition: {
  readonly id?: string | number | null;
  readonly active?: string | number | boolean | null;
  readonly name?: string | null;
  readonly dateddmmyyyy?: string | null;
  readonly provisional?: string | number | boolean | null;
  readonly finalised?: string | number | boolean | null;
}) => ({
  competitionId: String(competition.id ?? ""),
  name: competition.name ?? "",
  dateddmmyyyy: competition.dateddmmyyyy ?? null,
  active: String(competition.active ?? ""),
  provisional:
    competition.provisional == null ? null : String(competition.provisional),
  finalised: competition.finalised == null ? null : String(competition.finalised),
});

export const createSchemaCustomization: GatsbyNode["createSchemaCustomization"] =
  ({ actions }) => {
    actions.createTypes(`
      type Competition implements Node @dontInfer {
        id: ID!
        competitionId: String!
        name: String!
        dateddmmyyyy: String
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

  try {
    const competitions = await fetchWithBuildRetry(fetchAllCompetitions);
    console.log(`✅ Fetched ${competitions.length} competitions`);

    competitions.forEach((competition) => {
      const normalizedCompetition = normalizeCompetitionNode(competition);

      void createNode({
        ...normalizedCompetition,
        id: createNodeId(`Competition-${normalizedCompetition.competitionId}`),
        parent: null,
        children: [],
        internal: {
          type: "Competition",
          contentDigest: createContentDigest(normalizedCompetition),
        },
      });
    });
  } catch (error) {
    console.error("❌ Error fetching competitions:", error);
  }

  try {
    const event = await fetchWithBuildRetry(fetchEventLeaderboard);
    console.log(`✅ Fetched ${event.items.length} events`);
    void createNode({
      eventId: `${EVENT_COMPETITION_ID}-${EVENT_LEADERBOARD_ID}`,
      columns: event.columns,
      items: event.items,
      id: createNodeId(`EventList-${EVENT_COMPETITION_ID}-${EVENT_LEADERBOARD_ID}`),
      parent: null,
      children: [],
      internal: {
        type: "EventList",
        contentDigest: createContentDigest(event),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching event list:", error);
  }
};
