import { CompetitionStatus } from "../types/leaderboard";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "./competitionStatus";

describe("competitionStatusLabel", () => {
  test("returns Live for status 0", () => {
    expect(competitionStatusLabel(CompetitionStatus.Live)).toBe("Live");
  });

  test("returns Scheduled for status 1", () => {
    expect(competitionStatusLabel(CompetitionStatus.Scheduled)).toBe(
      "Scheduled",
    );
  });

  test("returns Finalised for status 2", () => {
    expect(competitionStatusLabel(CompetitionStatus.Finalised)).toBe(
      "Finalised",
    );
  });

  test("returns Provisional for status 3", () => {
    expect(competitionStatusLabel(CompetitionStatus.Provisional)).toBe(
      "Provisional",
    );
  });

  test("returns Open for undefined", () => {
    expect(competitionStatusLabel(undefined)).toBe("Open");
  });
});

describe("competitionStatusColor", () => {
  test("returns success for Live", () => {
    expect(competitionStatusColor(CompetitionStatus.Live)).toBe("success");
  });

  test("returns warning for Scheduled", () => {
    expect(competitionStatusColor(CompetitionStatus.Scheduled)).toBe("warning");
  });

  test("returns info for Finalised", () => {
    expect(competitionStatusColor(CompetitionStatus.Finalised)).toBe("info");
  });

  test("returns light for Provisional", () => {
    expect(competitionStatusColor(CompetitionStatus.Provisional)).toBe("light");
  });

  test("returns light for undefined", () => {
    expect(competitionStatusColor(undefined)).toBe("light");
  });
});
