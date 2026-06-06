import * as React from "react";
import { Link, type HeadFC } from "gatsby";
import { useEffect, useState } from "react";
import {
  Container,
  Heading,
  Hero,
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
import { parseDate } from "../lib/dataParser";

import "bulma/css/bulma.min.css";

const IndexPage = () => {
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
          setLoading(false);
        }
      } catch (fetchError) {
        if (!controller.signal.aborted && !isAbortError(fetchError)) {
          setError(getErrorMessage(fetchError, "Unable to load competitions"));
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
        <Hero className="is-info is-small">
          <Hero.Body>
            <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7">
              Gatsby TypeScript leaderboard app
            </p>
            <Heading renderAs="h2" size={3} className="mb-2">
              Live autotest results.
            </Heading>
            <p>Select a competition below to view its leaderboards.</p>
          </Hero.Body>
        </Hero>

        {loading && <p className="has-text-grey">Loading competitions…</p>}
        {error && <p className="has-text-danger">{error}</p>}
        {!loading && !error && competitions.length === 0 && (
          <p className="has-text-grey">No competitions found.</p>
        )}

        {competitions.length > 0 && (
          <Panel style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {competitions.map((competition) => (
              <Panel.Block
                key={competition.id}
                renderAs={Link}
                to={`/competition/${competition.id}`}
              >
                <Tag color={competitionStatusColor(competition.active)} mr={3}>
                  {competitionStatusLabel(competition.active)}
                </Tag>
                <span className="has-text-weight-medium">
                  {competition.name}
                </span>
                <span>
                  &nbsp;
                  <CompetitionDate date={parseDate(competition.dateddmmyyyy)} />
                </span>
                <span className="has-text-grey is-size-7 ml-auto">
                  {competition.dateddmmyyyy}
                </span>
              </Panel.Block>
            ))}
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
