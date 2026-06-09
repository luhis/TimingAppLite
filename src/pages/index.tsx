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
import { newValidDate } from "ts-date";

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
import { Footer } from "../components/Footer";
import { parseDate } from "../lib/dataParser";
import { AsyncData } from "../types/asyncData";

import "bulma/css/bulma.min.css";

const IndexPage = () => {
  const [state, setState] = useState<AsyncData<readonly Competition[]>>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadCompetitions = async () => {
      setState({ status: "loading" });

      try {
        const data = await fetchAllCompetitions(controller.signal);
        if (!controller.signal.aborted) {
          setState({
            status: "success",
            data: data.map((d) => ({
              ...d,
              dateddmmyyyy: parseDate(d.dateddmmyyyy) || newValidDate(),
            })),
          });
        }
      } catch (fetchError) {
        if (!controller.signal.aborted && !isAbortError(fetchError)) {
          setState({
            status: "error",
            error: getErrorMessage(fetchError, "Unable to load competitions"),
          });
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

        {state.status === "loading" && (
          <p className="has-text-grey">Loading competitions…</p>
        )}
        {state.status === "error" && (
          <p className="has-text-danger">{state.error}</p>
        )}
        {state.status === "success" && state.data.length === 0 && (
          <p className="has-text-grey">No competitions found.</p>
        )}

        {state.status === "success" && state.data.length > 0 && (
          <Panel style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {state.data.map((competition) => (
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

export const Head: HeadFC = () => (
  <>
    <title>Timing App Lite</title>
    <meta
      name="description"
      content="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    />
  </>
);
