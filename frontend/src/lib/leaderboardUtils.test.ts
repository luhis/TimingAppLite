import type {
  LeaderboardItem,
  LeaderboardPayloadFromApi,
} from "../types/leaderboard";
import { extractNotesText, mergeRowsByEntry } from "./leaderboardUtils";

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

describe("extractNotesText", () => {
  const makePayload = (
    columns: readonly { name: string; label: string }[],
    items: readonly Record<string, string | number | undefined>[],
  ): LeaderboardPayloadFromApi => ({
    columns,
    items: items.map((item) => ({
      classname: "",
      ...item,
    })),
  });

  test("returns text from first column of first item", () => {
    const payload = makePayload(
      [{ name: "notes", label: "Notes" }],
      [{ notes: "Hello world" }],
    );

    expect(extractNotesText(payload)).toBe("Hello world");
  });

  test("returns empty string when items array is empty", () => {
    const payload = makePayload([{ name: "notes", label: "Notes" }], []);

    expect(extractNotesText(payload)).toBe("");
  });

  test("returns empty string when columns array is empty", () => {
    const payload = makePayload([], [{ notes: "Hello" }]);

    expect(extractNotesText(payload)).toBe("");
  });

  test("returns empty string when both columns and items are empty", () => {
    const payload = makePayload([], []);

    expect(extractNotesText(payload)).toBe("");
  });

  test("returns cell value when present", () => {
    const payload = makePayload(
      [{ name: "notes", label: "Notes" }],
      [{ notes: "MattWozEre2026" }],
    );

    expect(extractNotesText(payload)).toBe("MattWozEre2026");
  });

  test("handles undefined cell value as empty string", () => {
    const payload = makePayload(
      [{ name: "notes", label: "Notes" }],
      [{ other: "value" }],
    );

    expect(extractNotesText(payload)).toBe("");
  });

  test("coerces numeric cell value to string", () => {
    const payload = makePayload(
      [{ name: "notes", label: "Notes" }],
      [{ notes: 42 }],
    );

    expect(extractNotesText(payload)).toBe("42");
  });

  test("preserves newlines in text", () => {
    const payload = makePayload(
      [{ name: "description", label: "Description" }],
      [{ description: "Line 1\nLine 2\nLine 3" }],
    );

    expect(extractNotesText(payload)).toBe("Line 1\nLine 2\nLine 3");
  });
});
