import type { LeaderboardItem } from "../types/leaderboard";
import { mergeRowsByEntry } from "./leaderboardUtils";

describe("mergeRowsByEntry", () => {
  test("updates existing rows with matching entry", () => {
    const existing: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:30" },
      { entry: "2", driver: "Bob", time: "1:45" },
    ];

    const incoming: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:25" },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      { entry: "1", driver: "Alice", time: "1:25" },
      { entry: "2", driver: "Bob", time: "1:45" },
    ]);
  });

  test("appends new rows that don't exist in existing", () => {
    const existing: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:30" },
    ];

    const incoming: readonly LeaderboardItem[] = [
      { entry: "2", driver: "Bob", time: "1:45" },
      { entry: "3", driver: "Charlie", time: "2:00" },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      { entry: "1", driver: "Alice", time: "1:30" },
      { entry: "2", driver: "Bob", time: "1:45" },
      { entry: "3", driver: "Charlie", time: "2:00" },
    ]);
  });

  test("preserves rows without entry key (section rows)", () => {
    const existing: readonly LeaderboardItem[] = [
      { classname: "Class A" },
      { entry: "1", driver: "Alice", time: "1:30" },
    ];

    const incoming: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:25" },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      { classname: "Class A" },
      { entry: "1", driver: "Alice", time: "1:25" },
    ]);
  });

  test("handles empty existing array", () => {
    const existing: readonly LeaderboardItem[] = [];

    const incoming: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:30" },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([{ entry: "1", driver: "Alice", time: "1:30" }]);
  });

  test("handles empty incoming array", () => {
    const existing: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:30" },
    ];

    const incoming: readonly LeaderboardItem[] = [];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([{ entry: "1", driver: "Alice", time: "1:30" }]);
  });

  test("sorts result by _index property", () => {
    const existing: readonly LeaderboardItem[] = [
      { entry: "1", driver: "Alice", time: "1:30", _index: 0 },
      { entry: "3", driver: "Charlie", time: "2:00", _index: 2 },
    ];

    const incoming: readonly LeaderboardItem[] = [
      { entry: "2", driver: "Bob", time: "1:45", _index: 1 },
      { entry: "1", driver: "Alice", time: "1:25", _index: 0 },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      { entry: "1", driver: "Alice", time: "1:25", _index: 0 },
      { entry: "2", driver: "Bob", time: "1:45", _index: 1 },
      { entry: "3", driver: "Charlie", time: "2:00", _index: 2 },
    ]);
  });
});
