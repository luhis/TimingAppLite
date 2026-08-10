import { renderHook, act } from "@testing-library/react";

import type { LeaderboardItem } from "../types/leaderboard";
import { useEntrantNotifications } from "./useEntrantNotifications";

const mockNotificationConstructor = jest.fn();
const mockRequestPermission = jest.fn();

// eslint-disable-next-line functional/immutable-data -- test setup for browser API mocking
Object.defineProperty(globalThis, "Notification", {
  value: jest.fn().mockImplementation((title: string, options?: unknown) => {
    mockNotificationConstructor(title, options);
    return {};
  }),
  writable: true,
  configurable: true,
});

// eslint-disable-next-line functional/immutable-data -- test setup for browser API mocking
Object.defineProperty(Notification, "permission", {
  get: () => "granted",
  configurable: true,
});

// eslint-disable-next-line functional/immutable-data -- test setup for browser API mocking
Object.defineProperty(Notification, "requestPermission", {
  value: mockRequestPermission,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  mockNotificationConstructor.mockClear();
  mockRequestPermission.mockClear();
  mockRequestPermission.mockResolvedValue("granted");
});

const setPermission = (value: string) =>
  // eslint-disable-next-line functional/immutable-data -- test helper for browser API mocking
  Object.defineProperty(Notification, "permission", {
    value,
    configurable: true,
  });

describe("useEntrantNotifications", () => {
  const makeRow = (entry: string, driver: string, pos?: string): LeaderboardItem => ({
    _index: 0,
    entry,
    driver,
    ...(pos !== undefined ? { pos } : {}),
    classname: "Class A",
    time: "1:30",
  });

  describe("notifyIfFavourite", () => {
    test("sends notification for favourited entrant", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [makeRow("5", "Alice", "1")];
      const isFavourite = (entry: string) => entry === "5";

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).toHaveBeenCalledTimes(1);
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Alice (P1)",
        expect.objectContaining({ body: "New result in Test Comp" }),
      );
    });

    test("does not send notification for non-favourited entrant", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [makeRow("5", "Alice", "1")];
      const isFavourite = (entry: string) => entry === "99";

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    test("sends notification for each favourited entrant in batch", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [
        makeRow("1", "Alice", "1"),
        makeRow("2", "Bob", "2"),
        makeRow("3", "Charlie", "3"),
      ];
      const isFavourite = (entry: string) => entry === "1" || entry === "3";

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).toHaveBeenCalledTimes(2);
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Alice (P1)",
        expect.anything(),
      );
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Charlie (P3)",
        expect.anything(),
      );
    });

    test("skips rows with undefined entry", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [
        { _index: 0, classname: "Section", driver: undefined, entry: undefined } as unknown as LeaderboardItem,
        makeRow("1", "Alice", "1"),
      ];
      const isFavourite = () => true;

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).toHaveBeenCalledTimes(1);
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Alice (P1)",
        expect.anything(),
      );
    });

    test("handles missing pos field gracefully", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [makeRow("1", "Alice")];
      const isFavourite = () => true;

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Alice",
        expect.objectContaining({ body: "New result in Test Comp" }),
      );
    });

    test("does not notify when permission is not granted", () => {
      setPermission("denied");

      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [makeRow("1", "Alice", "1")];
      const isFavourite = () => true;

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).not.toHaveBeenCalled();

      setPermission("granted");
    });

    test("empty rows produces no notification", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const isFavourite = () => true;

      act(() => {
        result.current.notifyIfFavourite([], isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    test("includes latest test value in body", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows: LeaderboardItem[] = [
        {
          _index: 0,
          entry: "5",
          driver: "Alice",
          pos: "1",
          classname: "Class A",
          test1: "48.2 47.9 48.1  TOT=96",
          test2: "60.0 59.1 58.2  TOT=117.3",
          test3: "42.6 42.1 WT=70.7  TOT=84.7",
          test4: "57.0 55.9 55.8  TOT=111.7",
        },
      ];
      const isFavourite = (entry: string) => entry === "5";

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Alice (P1)",
        expect.objectContaining({
          body: "New result in Test Comp — 57.0 55.9 55.8  TOT=111.7",
        }),
      );
    });

    test("body has no test value when no testX columns present", () => {
      const { result } = renderHook(() => useEntrantNotifications());

      const rows = [makeRow("1", "Alice", "1")];
      const isFavourite = () => true;

      act(() => {
        result.current.notifyIfFavourite(rows, isFavourite, "Test Comp");
      });

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        "Alice (P1)",
        expect.objectContaining({ body: "New result in Test Comp" }),
      );
    });
  });

  describe("requestPermission", () => {
    test("calls Notification.requestPermission when permission is default", async () => {
      setPermission("default");

      const { result } = renderHook(() => useEntrantNotifications());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockRequestPermission).toHaveBeenCalled();

      setPermission("granted");
    });

    test("does not call requestPermission when already granted", async () => {
      setPermission("granted");

      const { result } = renderHook(() => useEntrantNotifications());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockRequestPermission).not.toHaveBeenCalled();
    });
  });
});
