import * as React from "react";
import { Link, type HeadFC, type PageProps } from "gatsby";
import { useEffect, useState } from "react";
import { newValidDate } from "ts-date";

import {
  Box,
  Container,
  Heading,
  Panel,
  Section,
  Tag,
} from "react-bulma-components";
import {
  fetchAllCompetitions,
  isAbortError,
  getErrorMessage,
} from "../lib/leaderboardApi";
import { type Competition } from "../types/leaderboard";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";
import { CompetitionDate } from "../components/CompetitionDate";

import "bulma/css/bulma.min.css";

const IndexPage: React.FC<PageProps> = () => {
  const [competitions, setCompetitions] = useState<readonly Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadCompetitions = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAllCompetitions(controller.signal);

        if (!controller.signal.aborted) {
          setCompetitions(data);
        }
      } catch (fetchError) {
        if (!isAbortError(fetchError)) {
          setError(getErrorMessage(fetchError, "Unable to load competitions"));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadCompetitions();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <Section>
      <Container>
        <Box className="mb-5">
          <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-3">
            Gatsby TypeScript leaderboard app
          </p>
          <Heading renderAs="h1" size={1} className="mb-3">
            Live autotest results.
          </Heading>
          <p className="is-size-5 has-text-grey-dark">
            Select a competition below to view its leaderboards.
          </p>
        </Box>

        {loading && <p className="has-text-grey">Loading competitions…</p>}
        {error && <p className="has-text-danger">{error}</p>}

        {!loading && !error && competitions.length === 0 && (
          <p className="has-text-grey">No competitions found.</p>
        )}

        {competitions.length > 0 && (
          <Panel style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {competitions.map((competition) => {
              // "24th May 2026"
              const date = newValidDate(
                competition.dateddmmyyyy.replace(/(st|nd|rd|th)/, ""),
              );
              return (
                <Panel.Block
                  key={competition.id}
                  renderAs={Link}
                  to={`/competition/${competition.id}`}
                >
                  <Tag
                    color={competitionStatusColor(competition.active)}
                    mr={3}
                  >
                    {competitionStatusLabel(competition.active)}
                  </Tag>
                  <span className="has-text-weight-medium">
                    {competition.name}
                  </span>
                  <span>
                    &nbsp;<CompetitionDate date={date} />
                  </span>
                  <span className="has-text-grey is-size-7 ml-auto">
                    {competition.dateddmmyyyy}
                  </span>
                </Panel.Block>
              );
            })}
          </Panel>
        )}
      </Container>
    </Section>
  );
};

export default IndexPage;

export const Head: HeadFC = () => (
  <>
    <title>Timing App Lite</title>
    <meta
      name="description"
      content="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    />
  </>
);
