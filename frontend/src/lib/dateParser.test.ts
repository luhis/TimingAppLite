import { newValidDate } from "ts-date";

import {
  mapCompetitionNode,
  parseCompetitionDate,
  parseDate,
} from "./dataParser";
import { CompetitionStatus } from "../types/leaderboard";

describe("parseDate", () => {
  test("parses date with 'th' suffix", () => {
    expect(parseDate("24th May 2026")?.toDateString()).toBe(
      newValidDate("2026-05-24T00:00:00.000Z")?.toDateString(),
    );
  });

  test("parses date with 'st' suffix", () => {
    expect(parseDate("1st January 2026")?.toDateString()).toBe(
      newValidDate("2026-01-01T00:00:00.000Z")?.toDateString(),
    );
  });

  test("parses date with 'nd' suffix", () => {
    expect(parseDate("2nd March 2026")?.toDateString()).toBe(
      newValidDate("2026-03-02T00:00:00.000Z")?.toDateString(),
    );
  });

  test("parses date with 'rd' suffix", () => {
    expect(parseDate("3rd July 2026")?.toDateString()).toBe(
      newValidDate("2026-07-03T00:00:00.000Z")?.toDateString(),
    );
  });

  test("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });
});

describe("parseCompetitionDate", () => {
  test("parses dateddmmyyyy field into ValidDate", () => {
    const item = {
      id: "1",
      active: CompetitionStatus.Live,
      name: "Test Event",
      dateddmmyyyy: "24th May 2026",
      provisional: null,
      finalised: null,
    };

    const result = parseCompetitionDate(item);

    expect(result.dateddmmyyyy?.toDateString()).toBe(
      newValidDate("2026-05-24T00:00:00.000Z")?.toDateString(),
    );
  });

  test("falls back to current date for unparseable date", () => {
    const item = {
      id: "1",
      active: CompetitionStatus.Scheduled,
      name: "Test",
      dateddmmyyyy: "not a date",
      provisional: null,
      finalised: null,
    };

    const result = parseCompetitionDate(item);

    expect(result.dateddmmyyyy).toBeDefined();
    expect(result.dateddmmyyyy?.toDateString()).toBe(new Date().toDateString());
  });

  test("preserves other fields", () => {
    const item = {
      id: "42",
      active: CompetitionStatus.Finalised,
      name: "My Race",
      dateddmmyyyy: "1st June 2026",
      provisional: "Provisional text",
      finalised: "Finalised text",
    };

    const result = parseCompetitionDate(item);

    expect(result.id).toBe("42");
    expect(result.active).toBe(CompetitionStatus.Finalised);
    expect(result.name).toBe("My Race");
    expect(result.provisional).toBe("Provisional text");
    expect(result.finalised).toBe("Finalised text");
  });
});

describe("mapCompetitionNode", () => {
  test("maps valid node to Competition", () => {
    const result = mapCompetitionNode({
      competitionId: "10",
      active: CompetitionStatus.Live,
      name: "Sprint Race",
      dateddmmyyyy: "5th June 2026",
      provisional: null,
      finalised: null,
    });

    expect(result.id).toBe("10");
    expect(result.active).toBe(CompetitionStatus.Live);
    expect(result.name).toBe("Sprint Race");
    expect(result.dateddmmyyyy).toBeDefined();
  });

  test("defaults to Scheduled when active is null", () => {
    const result = mapCompetitionNode({
      competitionId: "1",
      active: null,
      name: "Test",
      dateddmmyyyy: "1st Jan 2026",
    });

    expect(result.active).toBe(CompetitionStatus.Scheduled);
  });

  test("defaults to Scheduled when active is invalid", () => {
    const result = mapCompetitionNode({
      competitionId: "1",
      active: "99",
      name: "Test",
      dateddmmyyyy: "1st Jan 2026",
    });

    expect(result.active).toBe(CompetitionStatus.Scheduled);
  });

  test("defaults empty fields to empty string", () => {
    const result = mapCompetitionNode({});

    expect(result.id).toBe("");
    expect(result.name).toBe("");
    expect(result.provisional).toBe("");
    expect(result.finalised).toBe("");
  });
});
