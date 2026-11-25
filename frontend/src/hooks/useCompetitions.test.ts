import { act, renderHook, waitFor } from "@testing-library/react";

import { retryWithBackoff } from "../lib/retryWithBackoff";
import { useCompetitions } from "./useCompetitions";

jest.mock("../lib/retryWithBackoff");

const initialNodes = [
  {
    competitionId: "1",
    name: "Original event",
    dateddmmyyyy: "2026-05-01",
    active: "0",
  },
];

afterEach(() => jest.resetAllMocks());

test("keeps build-time competitions and reports a failed refresh", async () => {
  const error = new Error("Offline");
  jest.mocked(retryWithBackoff).mockRejectedValue(error);
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const { result } = renderHook(() => useCompetitions(initialNodes));
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        "Failed to refresh competitions:",
        error,
      ),
    );
    expect(result.current[0].name).toBe("Original event");
  } finally {
    warn.mockRestore();
  }
});

test("aborts an in-flight refresh when the page unmounts", async () => {
  const pending = Promise.withResolvers<never>();
  jest.mocked(retryWithBackoff).mockReturnValue(pending.promise);
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const { unmount } = renderHook(() => useCompetitions(initialNodes));
    const signal = jest.mocked(retryWithBackoff).mock.calls[0][1];
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      pending.reject(new Error("Aborted"));
      await Promise.resolve();
    });
    expect(warn).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});
