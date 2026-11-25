import { act, renderHook, waitFor } from "@testing-library/react";

import { fetchLeaderboard, fetchLeaderboards } from "../lib/leaderboardApi";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import { useLeaderboardData } from "./useLeaderboardData";

jest.mock("../lib/leaderboardApi", () => ({
  fetchLeaderboard: jest.fn(),
  fetchLeaderboards: jest.fn(),
  isAbortError: (error: unknown) =>
    error instanceof DOMException && error.name === "AbortError",
  getErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));
jest.mock("../lib/retryWithBackoff", () => ({
  retryWithBackoff: jest.fn(
    (fetch: (signal: AbortSignal) => Promise<unknown>, signal: AbortSignal) =>
      fetch(signal),
  ),
}));

const row = { _index: 0, classname: "A", entry: "1", test1: "10" };
const isFavourite = () => true;
const notify = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchLeaderboards).mockResolvedValue([
    { id: "notes", name: "Event Notes" },
    { id: "1", name: "First" },
    { id: "2", name: "Second" },
  ]);
  jest.mocked(fetchLeaderboard).mockResolvedValue({
    columns: [{ name: "entry", label: "Entry" }],
    items: [row],
  });
});

test("loads the requested leaderboard, changes selection, and refreshes it", async () => {
  const { result } = renderHook(() =>
    useLeaderboardData("competition", "2", true, isFavourite, "Event", notify),
  );
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("success"),
  );
  expect(result.current.leaderboardId).toBe("2");
  expect(fetchLeaderboard).toHaveBeenLastCalledWith(
    "competition",
    "2",
    expect.any(AbortSignal),
  );

  act(() => result.current.changeLeaderboard("1"));
  await waitFor(() =>
    expect(fetchLeaderboard).toHaveBeenLastCalledWith(
      "competition",
      "1",
      expect.any(AbortSignal),
    ),
  );
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("success"),
  );
  act(() => result.current.refresh());
  await waitFor(() => expect(fetchLeaderboard).toHaveBeenCalledTimes(3));
});

test("uses each streamed update as the baseline for the next", async () => {
  const { result } = renderHook(() =>
    useLeaderboardData("competition", "", true, isFavourite, "Event", notify),
  );
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("success"),
  );
  const first = { ...row, test1: "11" };
  const second = { ...row, test1: "12" };
  act(() => {
    result.current.handleRowUpdate([first]);
    result.current.handleRowUpdate([second]);
  });

  expect(notify).toHaveBeenNthCalledWith(1, [first], isFavourite, "Event", [
    row,
  ]);
  expect(notify).toHaveBeenNthCalledWith(2, [second], isFavourite, "Event", [
    first,
  ]);
  expect(result.current.leaderboardState).toMatchObject({
    status: "success",
    data: { items: [second] },
  });
  expect(result.current.lastUpdateTime).toBeInstanceOf(Date);
});

test("tracks updates even before an entrant is favourited", async () => {
  const { result, rerender } = renderHook(
    ({ hasFavourites }) =>
      useLeaderboardData(
        "competition",
        "",
        hasFavourites,
        isFavourite,
        "Event",
        notify,
      ),
    { initialProps: { hasFavourites: false } },
  );
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("success"),
  );
  const first = { ...row, test1: "11" };
  const second = { ...row, test1: "12" };
  act(() => result.current.handleRowUpdate([first]));
  expect(notify).not.toHaveBeenCalled();
  rerender({ hasFavourites: true });
  act(() => result.current.handleRowUpdate([second]));
  expect(notify).toHaveBeenCalledWith([second], isFavourite, "Event", [first]);
  expect(fetchLeaderboard).toHaveBeenCalledTimes(1);
});

test("aborts an old result request and ignores its late response", async () => {
  const pending =
    Promise.withResolvers<Awaited<ReturnType<typeof fetchLeaderboard>>>();
  jest
    .mocked(fetchLeaderboard)
    .mockImplementation((_, id) =>
      id === "1"
        ? pending.promise
        : Promise.resolve({ columns: [], items: [{ ...row, entry: "2" }] }),
    );
  const { result } = renderHook(() =>
    useLeaderboardData("competition", "", true, isFavourite, "Event", notify),
  );
  await waitFor(() => expect(fetchLeaderboard).toHaveBeenCalledTimes(1));
  const oldSignal = jest.mocked(fetchLeaderboard).mock.calls[0][2];
  act(() => result.current.changeLeaderboard("2"));
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("success"),
  );
  expect(oldSignal?.aborted).toBe(true);

  await act(async () => {
    pending.resolve({ columns: [], items: [row] });
    await pending.promise;
  });
  expect(result.current.leaderboardState).toMatchObject({
    status: "success",
    data: { items: [{ entry: "2" }] },
  });
});

test("does not compare updates with the previous leaderboard during a switch", async () => {
  const pending = Promise.withResolvers<
    Awaited<ReturnType<typeof fetchLeaderboard>>
  >();
  jest.mocked(fetchLeaderboard).mockImplementation((_, id) =>
    id === "2"
      ? pending.promise
      : Promise.resolve({ columns: [], items: [row] }),
  );
  const { result } = renderHook(() =>
    useLeaderboardData("competition", "", true, isFavourite, "Event", notify),
  );
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("success"),
  );
  act(() => result.current.changeLeaderboard("2"));
  await waitFor(() =>
    expect(result.current.leaderboardState.status).toBe("loading"),
  );
  act(() => result.current.handleRowUpdate([{ ...row, test1: "20" }]));
  expect(notify).not.toHaveBeenCalled();

  const newBaseline = { ...row, test1: "30" };
  await act(async () => {
    pending.resolve({ columns: [], items: [newBaseline] });
    await pending.promise;
  });
  const update = { ...row, test1: "31" };
  act(() => result.current.handleRowUpdate([update]));
  expect(notify).toHaveBeenCalledWith(
    [update],
    isFavourite,
    "Event",
    [newBaseline],
  );
});

test("reports leaderboard load errors", async () => {
  jest.mocked(fetchLeaderboards).mockRejectedValue(new Error("Unavailable"));
  const { result } = renderHook(() =>
    useLeaderboardData("competition", "", false, isFavourite, "Event", notify),
  );
  await waitFor(() =>
    expect(result.current.leaderboardsState).toEqual({
      status: "error",
      error: "Unavailable",
    }),
  );
  expect(retryWithBackoff).toHaveBeenCalled();
});
