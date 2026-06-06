import * as React from "react";
import { Heading, Hero, Tag } from "react-bulma-components";
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

  return `🏎️ ${competition.dateddmmyyyy} 🏁 event feed`;
};

type HeroPanelProps = {
  readonly selectedCompetition: Competition | null;
};

export const HeroPanel = ({ selectedCompetition }: HeroPanelProps) => (
  <Hero className="is-info mb-3 is-small">
    <Hero.Body>
      <Tag color={competitionStatusColor(selectedCompetition?.active)}>
        {competitionStatusLabel(selectedCompetition?.active)}
      </Tag>
      <Heading renderAs="h2" size={3} className="mb-2">
        {selectedCompetition?.name ?? "Loading current event"}
      </Heading>
      <p>{formatMeta(selectedCompetition)}</p>
    </Hero.Body>
  </Hero>
);
