import { newValidDate } from "ts-date";

import { parseDate } from "./dataParser";

describe("parseDate", () => {
  test("24th May 2026", () => {
    expect(parseDate("24th May 2026")?.toDateString()).toBe(
      newValidDate("2026-05-24T00:00:00.000Z")?.toDateString(),
    );
  });
  test("", () => {
    expect(parseDate("")).toBeNull();
  });
});
