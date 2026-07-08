import * as React from "react";
import { Button, Heading, Hero, Tag } from "react-bulma-components";

import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";
import { type Competition } from "../types/leaderboard";

const EVENT_LIST_BASE =
  "https://autotest.sapphire-solutions.co.uk/eventlist.php";

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

  return `${competition.dateddmmyyyy.toLocaleDateString("en-gb")} event feed`;
};

const isFutureEvent = (competition: Competition | null): boolean => {
  if (!competition) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return competition.dateddmmyyyy >= today;
};

const getEnterDisabledReason = (
  competition: Competition | null,
  siteName: string | null,
): string | null => {
  if (!siteName) {
    return "Loading...";
  }
  if (!competition) {
    return "Loading competition data...";
  }
  if (!isFutureEvent(competition)) {
    return "Event has already taken place";
  }
  return null;
};

type HeroPanelProps = {
  readonly selectedCompetition: Competition | null;
  readonly siteName: string | null;
};

export const HeroPanel = ({
  selectedCompetition,
  siteName,
}: HeroPanelProps) => {
  const disabledReason = getEnterDisabledReason(selectedCompetition, siteName);
  const enterUrl =
    !disabledReason && siteName
      ? `${EVENT_LIST_BASE}?sitename=${encodeURIComponent(siteName)}`
      : undefined;

  return (
    <Hero className="is-info mb-3 is-small">
      <Hero.Body>
        <div className="is-flex is-justify-content-space-between is-align-items-center">
          <div>
            <Tag color={competitionStatusColor(selectedCompetition?.active)}>
              {competitionStatusLabel(selectedCompetition?.active)}
            </Tag>
            <Heading renderAs="h2" size={3} className="mb-2">
              {selectedCompetition?.name ?? "Loading current event"}
            </Heading>
            <p>🏎️ {formatMeta(selectedCompetition)} 🏁</p>
          </div>
          <Button
            color="white"
            rounded
            renderAs="a"
            href={enterUrl}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!!disabledReason}
            title={disabledReason ?? undefined}
          >
            Enter
          </Button>
        </div>
      </Hero.Body>
    </Hero>
  );
};
