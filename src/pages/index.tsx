import * as React from "react";
import { graphql, Link, type HeadFC } from "gatsby";
import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Heading,
  Hero,
  Panel,
  Section,
  Tag,
} from "react-bulma-components";
import { fetchAllCompetitions, isAbortError } from "../lib/leaderboardApi";
import { type Competition, CompetitionFromApi } from "../types/leaderboard";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";

import { CompetitionDate } from "../components/CompetitionDate";
import { Footer } from "../components/Footer";
import { parseCompetitionDate } from "../lib/dataParser";

import "bulma/css/bulma.min.css";

type IndexPageData = {
  readonly allCompetition: {
    readonly nodes: readonly CompetitionFromApi[];
  };
};

const IndexPage = ({ data }: { readonly data: IndexPageData }) => {
  const initialCompetitions = useMemo<readonly Competition[]>(
    () =>
      data.allCompetition.nodes.map(
        (node: IndexPageData["allCompetition"]["nodes"][number]) => ({
          ...parseCompetitionDate(node),
          id: node.id,
          name: node.name,
          active: node.active,
          provisional: node.provisional,
          finalised: node.finalised,
        }),
      ),
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

        {competitions.length === 0 ? (
          <p className="has-text-grey">No competitions found.</p>
        ) : (
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

export default IndexPage;

export const query = graphql`
  query {
    allCompetition {
      nodes {
        id
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
  <>
    <title>Timing App Lite</title>
    <meta
      name="description"
      content="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    />
  </>
);
