/** @jest-environment node */

import type { SourceNodesArgs } from "gatsby";
import { sourceNodes } from "./gatsby-node";
import {
  fetchAllCompetitions,
  fetchEventLeaderboard,
} from "./src/lib/leaderboardApi";
import { resolveSapphireSiteName } from "./src/lib/sapphire-site-name";

jest.mock("./src/lib/leaderboardApi", () => ({
  EVENT_COMPETITION_ID: "1435",
  EVENT_LEADERBOARD_ID: "99999",
  fetchAllCompetitions: jest.fn(),
  fetchEventLeaderboard: jest.fn(),
}));
jest.mock("./src/lib/sapphire-site-name", () => ({
  resolveSapphireSiteName: jest.fn(),
}));
jest.mock("./src/lib/retryWithBackoff", () => ({
  retryWithBackoff: (
    fetchFn: (signal: AbortSignal) => Promise<unknown>,
    signal: AbortSignal,
  ) => fetchFn(signal),
}));

test("creates mappings for successful site lookups and continues after failures", async () => {
  const backendUrl = jest.replaceProperty(process, "env", {
    ...process.env,
    GATSBY_BACKEND_URL: "http://localhost",
  });
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const createNode = jest.fn<
    ReturnType<SourceNodesArgs["actions"]["createNode"]>,
    Parameters<SourceNodesArgs["actions"]["createNode"]>
  >();
  jest.mocked(fetchAllCompetitions).mockResolvedValue([
    {
      id: "1",
      name: "One",
      dateddmmyyyy: "1st May 2026",
      active: "0",
      provisional: null,
      finalised: null,
    },
    {
      id: "2",
      name: "Two",
      dateddmmyyyy: "2nd May 2026",
      active: "0",
      provisional: null,
      finalised: null,
    },
  ]);
  jest.mocked(resolveSapphireSiteName).mockImplementation((id) =>
    id === "2"
      ? Promise.reject(new Error("not found"))
      : Promise.resolve("one-site"),
  );

  jest
    .mocked(fetchEventLeaderboard)
    .mockResolvedValue({ columns: [], items: [] });

  try {
    await sourceNodes!(
      {
        actions: { createNode } as Partial<
          SourceNodesArgs["actions"]
        > as SourceNodesArgs["actions"],
        createNodeId: (id: string) => id,
        createContentDigest: () => "digest",
      } as Partial<SourceNodesArgs> as SourceNodesArgs,
      { plugins: [] },
      () => {},
    );
    expect(resolveSapphireSiteName).toHaveBeenCalledTimes(2);
    expect(
      createNode.mock.calls.some(
        ([node]) =>
          node.id === "CompetitionSiteName-1" &&
          node.competitionId === "1" &&
          node.siteName === "one-site" &&
          node.internal.type === "CompetitionSiteName",
      ),
    ).toBe(true);
    expect(createNode).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "CompetitionSiteName-2" }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("competition 2"),
      expect.any(Error),
    );
    expect(createNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "EventList-1435-99999" }),
    );
  } finally {
    backendUrl.restore();
    errorSpy.mockRestore();
  }
});

test("waits for each batch of site-name requests before starting the next", async () => {
  const backendUrl = jest.replaceProperty(process, "env", {
    ...process.env,
    GATSBY_BACKEND_URL: "http://localhost",
  });
  const gate = Promise.withResolvers<void>();
  const siteName = jest.mocked(resolveSapphireSiteName);
  siteName.mockReset();
  siteName.mockImplementation(async (id) => {
    if (id !== "5") await gate.promise;
    return `site-${id}`;
  });
  jest.mocked(fetchAllCompetitions).mockResolvedValue(
    Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1),
      name: "Event",
      dateddmmyyyy: "1st May 2026",
      active: "0" as const,
      provisional: null,
      finalised: null,
    })),
  );
  jest
    .mocked(fetchEventLeaderboard)
    .mockResolvedValue({ columns: [], items: [] });

  const sourcing = sourceNodes!(
    {
      actions: { createNode: jest.fn() } as Partial<
        SourceNodesArgs["actions"]
      > as SourceNodesArgs["actions"],
      createNodeId: (id: string) => id,
      createContentDigest: () => "digest",
    } as Partial<SourceNodesArgs> as SourceNodesArgs,
    { plugins: [] },
    () => {},
  );

  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(siteName).toHaveBeenCalledTimes(4);
    gate.resolve();
    await sourcing;
    expect(siteName).toHaveBeenCalledTimes(5);
  } finally {
    gate.resolve();
    backendUrl.restore();
  }
});
