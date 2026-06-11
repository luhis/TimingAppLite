import type { LeaderboardItem } from "../types/leaderboard";
import { mergeRowsByEntry } from "./leaderboardUtils";

describe("mergeRowsByEntry", () => {
  test("updates existing rows with matching entry", () => {
    const existing: readonly LeaderboardItem[] = [
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
      {
        _index: 1,
        entry: "2",
        driver: "Bob",
        time: "1:45",
        classname: "Class A",
      },
    ];

    const incoming: readonly LeaderboardItem[] = [
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:25",
        classname: "Class A",
      },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:25",
        classname: "Class A",
      },
      {
        _index: 1,
        entry: "2",
        driver: "Bob",
        time: "1:45",
        classname: "Class A",
      },
    ]);
  });

  test("appends new rows that don't exist in existing", () => {
    const existing: readonly LeaderboardItem[] = [
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
    ];

    const incoming: readonly LeaderboardItem[] = [
      {
        _index: 1,
        entry: "2",
        driver: "Bob",
        time: "1:45",
        classname: "Class A",
      },
      {
        _index: 2,
        entry: "3",
        driver: "Charlie",
        time: "2:00",
        classname: "Class A",
      },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
      {
        _index: 1,
        entry: "2",
        driver: "Bob",
        time: "1:45",
        classname: "Class A",
      },
      {
        _index: 2,
        entry: "3",
        driver: "Charlie",
        time: "2:00",
        classname: "Class A",
      },
    ]);
  });

  test("preserves rows without entry key (section rows)", () => {
    const existing: readonly LeaderboardItem[] = [
      { _index: 0, classname: "Class A" },
      {
        _index: 1,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
    ];

    const incoming: readonly LeaderboardItem[] = [
      {
        _index: 1,
        entry: "1",
        driver: "Alice",
        time: "1:25",
        classname: "Class A",
      },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      { _index: 0, classname: "Class A" },
      {
        _index: 1,
        entry: "1",
        driver: "Alice",
        time: "1:25",
        classname: "Class A",
      },
    ]);
  });

  test("handles empty existing array", () => {
    const existing: readonly LeaderboardItem[] = [];

    const incoming: readonly LeaderboardItem[] = [
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
    ]);
  });

  test("handles empty incoming array", () => {
    const existing: readonly LeaderboardItem[] = [
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
    ];

    const incoming: readonly LeaderboardItem[] = [];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
    ]);
  });

  test("sorts result by _index property", () => {
    const existing: readonly LeaderboardItem[] = [
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:30",
        classname: "Class A",
      },
      {
        _index: 2,
        entry: "3",
        driver: "Charlie",
        time: "2:00",
        classname: "Class A",
      },
    ];

    const incoming: readonly LeaderboardItem[] = [
      {
        _index: 1,
        entry: "2",
        driver: "Bob",
        time: "1:45",
        classname: "Class A",
      },
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:25",
        classname: "Class A",
      },
    ];

    const result = mergeRowsByEntry(existing, incoming);

    expect(result).toEqual([
      {
        _index: 0,
        entry: "1",
        driver: "Alice",
        time: "1:25",
        classname: "Class A",
      },
      {
        _index: 1,
        entry: "2",
        driver: "Bob",
        time: "1:45",
        classname: "Class A",
      },
      {
        _index: 2,
        entry: "3",
        driver: "Charlie",
        time: "2:00",
        classname: "Class A",
      },
    ]);
  });
});
