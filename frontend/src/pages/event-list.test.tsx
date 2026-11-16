import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { PageProps } from "gatsby";
import EventListPage from "./event-list";
import { fetchEventLeaderboard } from "../lib/leaderboardApi";

jest.mock("gatsby", () => ({ graphql: jest.fn() }));
jest.unmock("react-bulma-components");
jest.mock("../components/Navbar", () => ({ Navbar: () => null }));
jest.mock("../components/Footer", () => ({ Footer: () => null }));
jest.mock("../components/SeoHead", () => ({ SeoHead: () => null }));
jest.mock("../lib/leaderboardApi", () => ({
  fetchEventLeaderboard: jest.fn(),
}));

test("shows matched site names after refreshing the event list", async () => {
  jest.mocked(fetchEventLeaderboard).mockResolvedValue({
    columns: [{ name: "name", label: "Event" }],
    items: [
      { classname: "", name: "Matched", date: "1st May 2026" },
      { classname: "", name: "Unmatched", date: "2nd May 2026" },
    ],
  });
  const props = {
    data: {
      allCompetition: {
        nodes: [
          { competitionId: "1", name: "Matched", dateddmmyyyy: "1st May 2026" },
        ],
      },
      allCompetitionSiteName: {
        nodes: [{ competitionId: "1", siteName: "my-site" }],
      },
      eventList: null,
    },
  } as Partial<
    PageProps<Queries.EventListPageQueryQuery>
  > as PageProps<Queries.EventListPageQueryQuery>;

  render(<EventListPage {...props} />);

  const matchedRow = (await screen.findByText("Matched")).closest("tr");
  const unmatchedRow = screen.getByText("Unmatched").closest("tr");
  expect(matchedRow).not.toBeNull();
  expect(unmatchedRow).not.toBeNull();
  expect(within(matchedRow!).getByText("My Site")).toBeInTheDocument();
  expect(within(unmatchedRow!).getByText("—")).toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Club Name" }),
  ).toBeInTheDocument();
});
