import * as React from "react";
import { useMemo } from "react";
import { graphql, Link, PageProps, type HeadFC } from "gatsby";
import startCase from "lodash/startCase";
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
import { useCompetitions } from "../hooks/useCompetitions";
import { createCompetitionSiteNameMap } from "../lib/eventSiteNames";

const IndexPage = (props: Readonly<PageProps<Queries.IndexPageQueryQuery>>) => {
  const { data } = props;
  const siteNames = useMemo(
    () => createCompetitionSiteNameMap(data.allCompetitionSiteName.nodes),
    [data],
  );
  const competitions = useCompetitions(data.allCompetition.nodes);

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
                    <span className="is-block has-text-grey is-size-7">
                      Club:{" "}
                      {startCase(siteNames.get(competition.id) ?? "") || "—"}
                    </span>
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
    allCompetitionSiteName {
      nodes {
        competitionId
        siteName
      }
    }
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
