import * as React from "react";
import { Box, Heading, Tag } from "react-bulma-components";
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
  <Box>
    <Tag color={competitionStatusColor(selectedCompetition?.active)}>
      {competitionStatusLabel(selectedCompetition?.active)}
    </Tag>
    <Heading renderAs="h2" size={3} className="mb-2">
      {selectedCompetition?.name ?? "Loading current event"}
    </Heading>
    <p className="mb-4">{formatMeta(selectedCompetition)}</p>
  </Box>
);
