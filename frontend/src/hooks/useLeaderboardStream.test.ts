import { renderHook, act } from "@testing-library/react";

import { useLeaderboardStream } from "./useLeaderboardStream";

const mockOn = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockWithUrl = jest.fn().mockReturnThis();
const mockWithAutomaticReconnect = jest.fn().mockReturnThis();
const mockConfigureLogging = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({
  on: mockOn,
  start: mockStart,
  stop: mockStop,
});

jest.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: jest.fn().mockImplementation(() => ({
    withUrl: mockWithUrl,
    withAutomaticReconnect: mockWithAutomaticReconnect,
    configureLogging: mockConfigureLogging,
    build: mockBuild,
  })),
  HttpTransportType: { WebSockets: 1, LongPolling: 4 },
  LogLevel: { Warning: 2 },
}));

const mockTrackException = jest.fn();

jest.mock("../lib/appInsights", () => ({
  trackException: (...args: readonly unknown[]) => mockTrackException(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStart.mockResolvedValue(undefined);
  mockStop.mockResolvedValue(undefined);
});

const getRegisteredHandler = (event: string) => {
  const call = mockOn.mock.calls.find(([name]) => name === event);
  expect(call).toBeDefined();
  return call![1] as jest.Mock;
};

describe("useLeaderboardStream", () => {
  test("does not create a connection when enabled is false", () => {
    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        false,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ),
    );

    expect(mockBuild).not.toHaveBeenCalled();
  });

  test("does not create a connection when competitionId is empty", () => {
    renderHook(() =>
      useLeaderboardStream("", "lb-1", true, jest.fn(), jest.fn(), jest.fn()),
    );

    expect(mockBuild).not.toHaveBeenCalled();
  });

  test("does not create a connection when leaderboardId is empty", () => {
    renderHook(() =>
      useLeaderboardStream("comp-1", "", true, jest.fn(), jest.fn(), jest.fn()),
    );

    expect(mockBuild).not.toHaveBeenCalled();
  });

  test("creates and starts a connection with subscription params in URL", () => {
    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ),
    );

    expect(mockBuild).toHaveBeenCalled();
    expect(mockWithUrl).toHaveBeenCalledWith(
      expect.stringContaining("competitionId=comp-1"),
      expect.anything(),
    );
    expect(mockWithUrl).toHaveBeenCalledWith(
      expect.stringContaining("leaderboardId=lb-1"),
      expect.anything(),
    );
    expect(mockStart).toHaveBeenCalled();
  });

  test("configures automatic reconnect and logging", () => {
    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ),
    );

    expect(mockWithAutomaticReconnect).toHaveBeenCalled();
    expect(mockConfigureLogging).toHaveBeenCalled();
  });

  test("registers handlers for ReceiveRowUpdate, ReceiveColumnUpdate, and ReceiveCompetitionUpdate", () => {
    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ),
    );

    expect(mockOn).toHaveBeenCalledTimes(3);
    expect(mockOn).toHaveBeenCalledWith(
      "ReceiveRowUpdate",
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      "ReceiveColumnUpdate",
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      "ReceiveCompetitionUpdate",
      expect.any(Function),
    );
  });

  test("calls onRowUpdate when non-empty rows are received", () => {
    const onRowUpdate = jest.fn();

    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        onRowUpdate,
        jest.fn(),
        jest.fn(),
      ),
    );

    const handler = getRegisteredHandler("ReceiveRowUpdate");
    const rows = [
      { _index: 0, entry: "1", driver: "Alice", classname: "A", pos: "1" },
    ];

    act(() => {
      handler(rows);
    });

    expect(onRowUpdate).toHaveBeenCalledWith(rows);
  });

  test("does not call onRowUpdate when rows are empty", () => {
    const onRowUpdate = jest.fn();

    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        onRowUpdate,
        jest.fn(),
        jest.fn(),
      ),
    );

    const handler = getRegisteredHandler("ReceiveRowUpdate");

    act(() => {
      handler([]);
    });

    expect(onRowUpdate).not.toHaveBeenCalled();
  });

  test("calls onColumnUpdate when non-empty columns are received", () => {
    const onColumnUpdate = jest.fn();

    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        onColumnUpdate,
        jest.fn(),
      ),
    );

    const handler = getRegisteredHandler("ReceiveColumnUpdate");
    const columns = [{ name: "pos", label: "Position" }];

    act(() => {
      handler(columns);
    });

    expect(onColumnUpdate).toHaveBeenCalledWith(columns);
  });

  test("does not call onColumnUpdate when columns are empty", () => {
    const onColumnUpdate = jest.fn();

    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        onColumnUpdate,
        jest.fn(),
      ),
    );

    const handler = getRegisteredHandler("ReceiveColumnUpdate");

    act(() => {
      handler([]);
    });

    expect(onColumnUpdate).not.toHaveBeenCalled();
  });

  test("calls onCompetitionUpdate when a competition update is received", () => {
    const onCompetitionUpdate = jest.fn();

    renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        jest.fn(),
        onCompetitionUpdate,
      ),
    );

    const handler = getRegisteredHandler("ReceiveCompetitionUpdate");
    const competition = {
      id: "comp-1",
      name: "Test",
      active: "0",
      dateddmmyyyy: new Date(),
    };

    act(() => {
      handler(competition);
    });

    expect(onCompetitionUpdate).toHaveBeenCalledWith(competition);
  });

  test("stops connection on cleanup", async () => {
    const { unmount } = renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ),
    );

    await act(async () => {
      unmount();
    });

    expect(mockStop).toHaveBeenCalled();
  });

  test("cleanup is safe when connection never started", async () => {
    mockStart.mockRejectedValue(new Error("connection failed"));

    const { unmount } = renderHook(() =>
      useLeaderboardStream(
        "comp-1",
        "lb-1",
        true,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ),
    );

    await act(async () => {
      unmount();
    });

    expect(mockStop).not.toHaveBeenCalled();
  });

  test("reports trackException when connection start fails", async () => {
    const error = new Error("connection failed");
    mockStart.mockRejectedValue(error);

    await act(async () => {
      renderHook(() =>
        useLeaderboardStream(
          "comp-1",
          "lb-1",
          true,
          jest.fn(),
          jest.fn(),
          jest.fn(),
        ),
      );
    });

    expect(mockTrackException).toHaveBeenCalledWith(error, {
      signalRHubUrl: expect.stringContaining("/hubs/leaderboard"),
      competitionId: "comp-1",
      leaderboardId: "lb-1",
    });
  });
});
