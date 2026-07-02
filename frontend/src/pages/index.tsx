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
import { addMonth, diffDate, newValidDate } from "ts-date";

import { CompetitionDate } from "../components/CompetitionDate";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { SeoHead } from "../components/SeoHead";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";
import { mapCompetitionNode, parseCompetitionDate } from "../lib/dataParser";
import { fetchAllCompetitions, isAbortError } from "../lib/leaderboardApi";
import { type Competition } from "../types/leaderboard";

const IndexPage = (props: Readonly<PageProps<Queries.IndexPageQueryQuery>>) => {
  const { data } = props;
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

  const currentCompetitions = useMemo(() => {
    const today = newValidDate();
    return competitions
      .filter(
        (competition) =>
          diffDate(competition.dateddmmyyyy, today) >= 0 &&
          diffDate(competition.dateddmmyyyy, addMonth(today, 6)) <= 0,
      )
      .sort((a, b) => diffDate(a.dateddmmyyyy, b.dateddmmyyyy));
  }, [competitions]);

  return (
    <>
      <Navbar />
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

          {currentCompetitions.length === 0 ? (
            <p className="has-text-grey">No current competitions found.</p>
          ) : (
            <Panel style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {currentCompetitions.map((competition) => (
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
                  <span className="has-text-grey is-size-7 ml-auto">
                    <CompetitionDate date={competition.dateddmmyyyy} />
                    &nbsp;
                    {competition.dateddmmyyyy.toLocaleDateString("en-gb")}
                  </span>
                </Panel.Block>
              ))}
            </Panel>
          )}
        </Container>
        <Footer />
      </Section>
    </>
  );
};

export default IndexPage;

export const query = graphql`
  query IndexPageQuery {
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
    title="Timing App Lite"
    description="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    path="/"
  />
);
