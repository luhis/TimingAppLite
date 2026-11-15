/** @jest-environment node */

import {
  fetchAllCompetitions,
  fetchLeaderboard,
  getErrorMessage,
  isAbortError,
} from "./leaderboardApi";

describe("API JSON responses", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns an unwrapped competition array", async () => {
    const competitions = [{ id: "1", name: "Test" }];
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(competitions)),
    );

    await expect(fetchAllCompetitions()).resolves.toEqual(competitions);
  });

  test("returns an unwrapped leaderboard object", async () => {
    const leaderboard = { columns: [], items: [] };
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(leaderboard)),
    );

    await expect(fetchLeaderboard("1", "2")).resolves.toEqual(leaderboard);
  });
});

describe("isAbortError", () => {
  test("returns true for DOMException with name AbortError", () => {
    const error = new DOMException("The operation was aborted", "AbortError");
    expect(isAbortError(error)).toBe(true);
  });

  test("returns false for DOMException with other name", () => {
    const error = new DOMException("Something went wrong", "NotAbortError");
    expect(isAbortError(error)).toBe(false);
  });

  test("returns false for regular Error", () => {
    expect(isAbortError(new Error("test"))).toBe(false);
  });

  test("returns false for null", () => {
    expect(isAbortError(null)).toBe(false);
  });

  test("returns false for string", () => {
    expect(isAbortError("AbortError")).toBe(false);
  });
});

describe("getErrorMessage", () => {
  test("returns message from Error instance", () => {
    expect(getErrorMessage(new Error("something broke"), "fallback")).toBe(
      "something broke",
    );
  });

  test("returns fallback for non-Error value", () => {
    expect(getErrorMessage("string error", "fallback")).toBe("fallback");
  });

  test("returns fallback for null", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
  });

  test("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
