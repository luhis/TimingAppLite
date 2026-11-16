import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { PageProps } from "gatsby";
import IndexPage from "./index";
import { fetchAllCompetitions } from "../lib/leaderboardApi";

jest.mock("gatsby", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  return {
    graphql: jest.fn(),
    Link: ({
      children,
      to,
    }: {
      readonly children?: React.ReactNode;
      readonly to: string;
    }) => react.createElement("a", { href: to }, children),
  };
});
jest.unmock("react-bulma-components");
jest.mock("../components/Navbar", () => ({ Navbar: () => null }));
jest.mock("../components/Footer", () => ({ Footer: () => null }));
jest.mock("../components/SeoHead", () => ({ SeoHead: () => null }));
jest.mock("../lib/leaderboardApi", () => ({
  fetchAllCompetitions: jest.fn(),
}));

test("shows club names by competition ID after a refresh", async () => {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  jest.mocked(fetchAllCompetitions).mockResolvedValue([
    {
      id: "1",
      name: "Refreshed event",
      dateddmmyyyy: date,
      active: "0",
      provisional: null,
      finalised: null,
    },
    {
      id: "2",
      name: "New event",
      dateddmmyyyy: date,
      active: "0",
      provisional: null,
      finalised: null,
    },
  ]);
  const props = {
    data: {
      allCompetition: { nodes: [] },
      allCompetitionSiteName: {
        nodes: [{ competitionId: "1", siteName: "my-site" }],
      },
    },
  } as Partial<
    PageProps<Queries.IndexPageQueryQuery>
  > as PageProps<Queries.IndexPageQueryQuery>;

  render(<IndexPage {...props} />);

  const matched = await screen.findByRole("link", { name: /Refreshed event/ });
  const unmatched = screen.getByRole("link", { name: /New event/ });
  expect(within(matched).getByText("Club: My Site")).toBeInTheDocument();
  expect(within(unmatched).getByText("Club: —")).toBeInTheDocument();
});
