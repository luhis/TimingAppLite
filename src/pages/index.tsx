import * as React from "react";
import { Link, type HeadFC, type PageProps } from "gatsby";
import { useEffect, useState } from "react";

import { Box, Container, Heading, Section, Tag } from "react-bulma-components";
import { fetchAllCompetitions } from "../lib/leaderboardApi";
import { type Competition } from "../types/leaderboard";
import {
  competitionStatusColor,
  competitionStatusLabel,
} from "../lib/competitionStatus";

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
        if (
          !(
            fetchError instanceof DOMException &&
            fetchError.name === "AbortError"
          )
        ) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load competitions",
          );
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

        {competitions.map((competition) => (
          <Link
            key={competition.id}
            to={`/competition/${competition.id}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Box className="mb-3" style={{ cursor: "pointer" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <Tag color={competitionStatusColor(competition.active)}>
                  {competitionStatusLabel(competition.active)}
                </Tag>
                <Heading renderAs="h2" size={5} className="mb-0">
                  {competition.name}
                </Heading>
                <span className="has-text-grey is-size-6">
                  {competition.dateddmmyyyy}
                </span>
              </div>
            </Box>
          </Link>
        ))}
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
