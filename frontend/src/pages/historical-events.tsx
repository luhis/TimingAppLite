import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { graphql, Link, PageProps, type HeadFC } from "gatsby";
import {
  Container,
  Heading,
  Hero,
  Panel,
  Section,
  Tag,
} from "react-bulma-components";
import { diffDate, newValidDate } from "ts-date";

import { CompetitionDate } from "../components/CompetitionDate";
import { SeoHead } from "../components/SeoHead";
import { Competition } from "../types/leaderboard";
import { mapCompetitionNode, parseCompetitionDate } from "../lib/dataParser";
import { fetchAllCompetitions, isAbortError } from "../lib/leaderboardApi";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";
import { Footer } from "../components/Footer";

const HistoricalEventsPage: React.FC<
  PageProps<Queries.HistoricalEventsPageQueryQuery>
> = ({ data }) => {
  const initialCompetitions = useMemo<readonly Competition[]>(
    () => data.allCompetition.nodes.map(mapCompetitionNode),
    [data],
  );

  const [competitions, setCompetitions] =
    useState<readonly Competition[]>(initialCompetitions);

  useEffect(() => {
    const controller = new AbortController();

    const refreshCompetitions = async () => {
      try {
        const freshData = await fetchAllCompetitions(controller.signal);
        if (!controller.signal.aborted) {
          setCompetitions(freshData.map(parseCompetitionDate));
        }
      } catch (fetchError) {
        // Keep existing data on error
        if (!controller.signal.aborted && !isAbortError(fetchError)) {
          console.warn("Failed to refresh competitions:", fetchError);
        }
      }
    };

    void refreshCompetitions();

    return () => {
      controller.abort();
    };
  }, []);

  const historicalCompetitions = useMemo(() => {
    const today = newValidDate();
    return competitions
      .filter((competition) => diffDate(competition.dateddmmyyyy, today) < 0)
      .sort((a, b) => diffDate(b.dateddmmyyyy, a.dateddmmyyyy));
  }, [competitions]);

  return (
    <Section>
      <Container>
        <Hero className="is-info is-small">
          <Hero.Body>
            <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7">
              Gatsby TypeScript leaderboard app
            </p>
            <Heading renderAs="h2" size={3} className="mb-2">
              Historical events.
            </Heading>
            <p>Browse past competition results.</p>
          </Hero.Body>
        </Hero>

        <div className="mb-3">
          <Link to="/" className="has-text-link is-size-6">
            ← Current events
          </Link>
        </div>

        {historicalCompetitions.length === 0 ? (
          <p className="has-text-grey">No historical competitions found.</p>
        ) : (
          <Panel style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {historicalCompetitions.map((competition) => (
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
                  <CompetitionDate date={competition.dateddmmyyyy} />
                </span>
                <span className="has-text-grey is-size-7 ml-auto">
                  {competition.dateddmmyyyy.toLocaleDateString("en-gb")}
                </span>
              </Panel.Block>
            ))}
          </Panel>
        )}
      </Container>
      <Footer />
    </Section>
  );
};

export default HistoricalEventsPage;

export const query = graphql`
  query HistoricalEventsPageQuery {
    allCompetition {
      nodes {
        competitionId
        name
        dateddmmyyyy
        active
        provisional
        finalised
      }
    }
  }
`;

export const Head: HeadFC = () => (
  <SeoHead
    title="Historical Events · Timing App Lite"
    description="Browse past competition results from the Sapphire Solutions autotest API."
    path="/historical-events"
  />
);
