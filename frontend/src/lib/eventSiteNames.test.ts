import { createEventSiteNameLookup } from "./eventSiteNames";

describe("createEventSiteNameLookup", () => {
  const competitions = [
    { competitionId: "1", name: "Event", dateddmmyyyy: "1st May 2026" },
    { competitionId: "2", name: "Event", dateddmmyyyy: "2nd May 2026" },
    { competitionId: "3", name: "Duplicate", dateddmmyyyy: "3rd May 2026" },
    { competitionId: "4", name: "Duplicate", dateddmmyyyy: "3rd May 2026" },
  ];
  const lookup = createEventSiteNameLookup(competitions, [
    { competitionId: "1", siteName: "first" },
    { competitionId: "2", siteName: "second" },
    { competitionId: "3", siteName: "ambiguous" },
  ]);

  test("matches both name and date", () => {
    expect(lookup("Event", "1st May 2026")).toBe("first");
    expect(lookup("Event", "2nd May 2026")).toBe("second");
    expect(lookup("Event", "4th May 2026")).toBeNull();
  });

  test("does not guess for ambiguous, missing or incomplete matches", () => {
    expect(lookup("Duplicate", "3rd May 2026")).toBeNull();
    expect(lookup("Unknown", "1st May 2026")).toBeNull();
    expect(lookup("", "")).toBeNull();
    expect(lookup(undefined, undefined)).toBeNull();
  });
});
