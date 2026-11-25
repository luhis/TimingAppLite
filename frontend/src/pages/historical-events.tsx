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
import { diffDate, newValidDate } from "ts-date";

import { CompetitionDate } from "../components/CompetitionDate";
import { Navbar } from "../components/Navbar";
import { SeoHead } from "../components/SeoHead";
import { useCompetitions } from "../hooks/useCompetitions";
import { createCompetitionSiteNameMap } from "../lib/eventSiteNames";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";
import { Footer } from "../components/Footer";

const HistoricalEventsPage = (
  props: Readonly<PageProps<Queries.HistoricalEventsPageQueryQuery>>,
) => {
  const { data } = props;
  const siteNames = useMemo(
    () => createCompetitionSiteNameMap(data.allCompetitionSiteName.nodes),
    [data],
  );
  const competitions = useCompetitions(data.allCompetition.nodes);

  const historicalCompetitions = useMemo(() => {
    const today = newValidDate();
    return competitions
      .filter((competition) => diffDate(competition.dateddmmyyyy, today) < 0)
      .sort((a, b) => diffDate(b.dateddmmyyyy, a.dateddmmyyyy));
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
                Historical events.
              </Heading>
              <p>Browse past competition results.</p>
            </Hero.Body>
          </Hero>

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
    </>
  );
};

export default HistoricalEventsPage;

export const query = graphql`
  query HistoricalEventsPageQuery {
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
    title="Historical Events · Timing App Lite"
    description="Browse past competition results from the Sapphire Solutions autotest API."
    path="/historical-events"
  />
);
