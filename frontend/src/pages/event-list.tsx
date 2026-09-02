import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { graphql, PageProps, type HeadFC } from "gatsby";
import {
  Container,
  Heading,
  Hero,
  Section,
  Table,
} from "react-bulma-components";

import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { SeoHead } from "../components/SeoHead";
import { parseDate } from "../lib/dataParser";
import { fetchEventLeaderboard } from "../lib/leaderboardApi";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import type {
  LeaderboardColumn,
  LeaderboardItemFromApi,
} from "../types/leaderboard";
import type { AsyncData } from "../types/asyncData";

type EventListData = {
  readonly columns: readonly LeaderboardColumn[];
  readonly items: readonly LeaderboardItemFromApi[];
};

const mapEventListNode = (node: {
  readonly columns?: unknown;
  readonly items?: unknown;
}): EventListData => ({
  columns: (node.columns as readonly LeaderboardColumn[]) ?? [],
  items: (node.items as readonly LeaderboardItemFromApi[]) ?? [],
});

const EventListPage = (
  props: Readonly<PageProps<Queries.EventListPageQueryQuery>>,
) => {
  const { data } = props;
  const initialData = useMemo<EventListData>(
    () => mapEventListNode(data.eventList ?? {}),
    [data],
  );

  const [eventData, setEventData] = useState<EventListData>(initialData);

  const [asyncState, setAsyncState] = useState<AsyncData<EventListData>>({
    status: "idle",
  });

  useEffect(() => {
    const controller = new AbortController();

    const refreshEvents = async () => {
      setAsyncState({ status: "loading" });

      try {
        const payload = await retryWithBackoff(
          (signal) => fetchEventLeaderboard(signal),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setEventData({
            columns: payload.columns,
            items: payload.items,
          });
          setAsyncState({
            status: "success",
            data: { columns: payload.columns, items: payload.items },
          });
        }
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setAsyncState({
            status: "error",
            error:
              fetchError instanceof Error
                ? fetchError.message
                : "Unable to load events",
          });
        }
      }
    };

    void refreshEvents();

    return () => {
      controller.abort();
    };
  }, []);

  const error = asyncState.status === "error" ? asyncState.error : null;
  const isLoading = asyncState.status === "loading";

  return (
    <>
      <Navbar />
      <Section>
        <Container>
          <Hero className="is-info is-small">
            <Hero.Body>
              <Heading renderAs="h2" size={3} className="mb-2">
                Event List
              </Heading>
              <p>Upcoming and recent events from the autotest calendar.</p>
            </Hero.Body>
          </Hero>

          {error && <div className="notification is-danger">{error}</div>}
          {isLoading && (
            <div className="notification is-light">
              Fetching latest event data…
            </div>
          )}

          <Table.Container style={{ maxHeight: "80vh", overflow: "auto" }}>
            <Table striped hoverable bordered className="is-fullwidth">
              <thead>
                <tr>
                  {eventData.columns.map((column) => (
                    <th key={column.name}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventData.items.length > 0 ? (
                  eventData.items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      {eventData.columns.map((column) => {
                        const value = item[column.name];
                        const displayValue =
                          column.name === "date" && typeof value === "string"
                            ? (parseDate(value)?.toLocaleDateString("en-gb") ??
                              value)
                            : String(value ?? "");
                        return <td key={column.name}>{displayValue}</td>;
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={Math.max(eventData.columns.length, 1)}
                      className="has-text-centered has-text-grey py-6"
                    >
                      {isLoading ? "Loading events…" : "No events found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Table.Container>
        </Container>
        <Footer />
      </Section>
    </>
  );
};

export default EventListPage;

export const query = graphql`
  query EventListPageQuery {
    eventList {
      columns {
        name
        label
      }
      items {
        name
        entries
        date
      }
    }
  }
`;

export const Head: HeadFC = () => (
  <SeoHead
    title="Event List · Timing App Lite"
    description="Upcoming and recent autotest events."
    path="/event-list"
  />
);
