import * as React from "react";
import startCase from "lodash/startCase";
import { Tag } from "react-bulma-components";

import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";
import type { Competition } from "../types/leaderboard";

export const CompetitionSummary = ({
  competition,
  siteName,
}: {
  readonly competition: Competition;
  readonly siteName: string | undefined;
}) => (
  <>
    <Tag color={competitionStatusColor(competition.active)} mr={3}>
      {competitionStatusLabel(competition.active)}
    </Tag>
    <span className="has-text-weight-medium">
      {competition.name}
      <span className="is-block has-text-grey is-size-7">
        Club: {startCase(siteName ?? "") || "—"}
      </span>
    </span>
  </>
);
