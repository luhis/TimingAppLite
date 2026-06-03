import * as React from "react";
import { Box, Columns, Heading, Tag } from "react-bulma-components";
import {
  CompetitionStatus,
  type Competition,
  type LeaderboardSummary,
} from "../types/leaderboard";

const competitionStatusLabel = (
  active: CompetitionStatus | undefined,
): string => {
  switch (active) {
    case CompetitionStatus.Live:
      return "Live";
    case CompetitionStatus.Scheduled:
      return "Scheduled";
    case CompetitionStatus.Finalised:
      return "Finalised";
    case CompetitionStatus.Provisional:
      return "Provisional";
    case undefined:
    default:
      return "Open";
  }
};

const competitionStatusColor = (
  status: CompetitionStatus | undefined,
): string => {
  switch (status) {
    case CompetitionStatus.Live:
      return "success";
    case CompetitionStatus.Scheduled:
      return "warning";
    case CompetitionStatus.Finalised:
      return "info";
    case CompetitionStatus.Provisional:
    case undefined:
    default:
      return "light";
  }
};

const formatMeta = (competition: Competition | null): string => {
  if (!competition) {
    return "Waiting for live data";
  }

  if (competition.finalised) {
    return `Finalised ${competition.finalised}`;
  }

  if (competition.provisional) {
    return `Provisional ${competition.provisional}`;
  }

  return `${competition.dateddmmyyyy} event feed`;
};

type HeroPanelProps = {
  readonly competitionsCount: number;
  readonly leaderboardsCount: number;
  readonly dataRowCount: number;
  readonly leaderboardLoaded: boolean;
  readonly selectedCompetition: Competition | null;
  readonly selectedLeaderboard: LeaderboardSummary | null;
};

export const HeroPanel = ({
  competitionsCount,
  leaderboardsCount,
  dataRowCount,
  leaderboardLoaded,
  selectedCompetition,
  selectedLeaderboard,
}: HeroPanelProps) => (
  <Box className="mb-5">
    <Columns>
      <Columns.Column size={8}>
        <Box>
          <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-3">
            Gatsby TypeScript leaderboard app
          </p>
          <Heading renderAs="h1" size={1} className="mb-3">
            Live autotest results without scraping the page.
          </Heading>
          <p className="is-size-5 has-text-grey-dark">
            This app talks directly to the Sapphire Solutions API behind the
            leaderboard site, surfaces the live event feed, and lets you filter
            results quickly without leaving the page.
          </p>
          <Columns className="mt-4 is-variable is-4">
            <Columns.Column>
              <Box>
                <p className="has-text-grey is-size-7">Events</p>
                <Heading renderAs="p" size={3} className="mb-0">
                  {competitionsCount || "--"}
                </Heading>
              </Box>
            </Columns.Column>
            <Columns.Column>
              <Box>
                <p className="has-text-grey is-size-7">Boards</p>
                <Heading renderAs="p" size={3} className="mb-0">
                  {leaderboardsCount || "--"}
                </Heading>
              </Box>
            </Columns.Column>
            <Columns.Column>
              <Box>
                <p className="has-text-grey is-size-7">Visible rows</p>
                <Heading renderAs="p" size={3} className="mb-0">
                  {leaderboardLoaded ? dataRowCount : "--"}
                </Heading>
              </Box>
            </Columns.Column>
          </Columns>
        </Box>
      </Columns.Column>

      <Columns.Column size={4}>
        <Box>
          <Tag color={competitionStatusColor(selectedCompetition?.active)}>
            {competitionStatusLabel(selectedCompetition?.active)}
          </Tag>
          <Heading renderAs="h2" size={3} className="mb-2">
            {selectedCompetition?.name ?? "Loading current event"}
          </Heading>
          <p className="mb-4">{formatMeta(selectedCompetition)}</p>
          <p className="has-text-grey is-size-7 mb-1">Board</p>
          <p className="mb-3 has-text-weight-semibold">
            {selectedLeaderboard?.name ?? "Waiting for leaderboard"}
          </p>
          <p className="has-text-grey is-size-7 mb-1">Source</p>
          <p className="has-text-weight-semibold">
            autotest.sapphire-solutions.co.uk/API/1
          </p>
        </Box>
      </Columns.Column>
    </Columns>
  </Box>
);
