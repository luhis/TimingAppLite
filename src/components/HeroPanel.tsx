import * as React from "react";
import { Box, Columns, Heading, Tag } from "react-bulma-components";
import { type Competition } from "../types/leaderboard";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";

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
  readonly selectedCompetition: Competition | null;
};

export const HeroPanel = ({ selectedCompetition }: HeroPanelProps) => (
  <Box className="mb-5">
    <Columns>
      <Columns.Column size={8}>
        <Box>
          <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-3">
            Gatsby TypeScript leaderboard app
          </p>
          <Heading renderAs="h1" size={1} className="mb-3">
            Live autotest results.
          </Heading>
          <p className="is-size-5 has-text-grey-dark">
            This app talks to the Sapphire Solutions API via a compression and
            push service. It aims to improve the experience of viewing live
            competition results on mobile devices.
          </p>
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
        </Box>
      </Columns.Column>
    </Columns>
  </Box>
);
