import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { graphql, type HeadFC } from "gatsby";
import { Columns, Container, Section } from "react-bulma-components";
import { newValidDate } from "ts-date";

import { ControlsPanel } from "../../components/ControlsPanel";
import { EventNotesPanel } from "../../components/EventNotesPanel";
import { Footer } from "../../components/Footer";
import { HeroPanel } from "../../components/HeroPanel";
import { Navbar } from "../../components/Navbar";
import { ResultsPanel } from "../../components/ResultsPanel";
import { SeoHead } from "../../components/SeoHead";
import { useEntrantNotifications } from "../../hooks/useEntrantNotifications";
import { useFavourites } from "../../hooks/useFavourites";
import { useLeaderboardData } from "../../hooks/useLeaderboardData";
import { useLeaderboardStream } from "../../hooks/useLeaderboardStream";
import { parseCompetitionDate } from "../../lib/dataParser";
import {
  fetchAllCompetitions,
  fetchLeaderboard,
} from "../../lib/leaderboardApi";
import { retryWithBackoff } from "../../lib/retryWithBackoff";
import {
  extractNotesText,
  filterLeaderboardRows,
  getLeaderboardClassOptions,
  isSectionRow,
} from "../../lib/leaderboardUtils";
import {
  type Competition,
  CompetitionStatus,
  type FilterState,
} from "../../types/leaderboard";

const initialFilters: FilterState = {
  query: "",
  driver: "",
  className: "",
};

const isCompetitionToday = (competition: Competition | null): boolean =>
  competition?.dateddmmyyyy
    ? competition.dateddmmyyyy.toDateString() === newValidDate().toDateString()
    : false;

const CompetitionPage = ({
  params,
  location,
  data: pageData,
}: {
  readonly params: { readonly competitionId: string };
  readonly location: { readonly search: string };
  readonly data: Queries.CompetitionPageQueryQuery;
}) => {
  const competitionId = params.competitionId;
  const siteName =
    pageData.allCompetitionSiteName.nodes.find(
      (node) => node.competitionId === competitionId,
    )?.siteName ?? null;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [streamResults, setStreamResults] = useState(true);
  const [eventNotes, setEventNotes] = useState("");

  const {
    favouriteEntries,
    toggle: toggleFavourite,
    isFavourite,
  } = useFavourites();
  const {
    permission: notificationPermission,
    requestPermission,
    notifyIfFavourite,
  } = useEntrantNotifications();

  const requestedLeaderboardId = useMemo(
    () => new URLSearchParams(location.search).get("leaderboardid") ?? "",
    [location.search],
  );

  const {
    leaderboardsState,
    leaderboardState,
    leaderboardId,
    lastUpdateTime,
    isBusy,
    changeLeaderboard,
    refresh,
    handleRowUpdate,
    handleColumnUpdate,
  } = useLeaderboardData(
    competitionId,
    requestedLeaderboardId,
    favouriteEntries.size > 0,
    isFavourite,
    competition?.name ?? "Competition",
    notifyIfFavourite,
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadCompetition = async () => {
      try {
        const data = await retryWithBackoff(
          (signal) => fetchAllCompetitions(signal),
          controller.signal,
          { maxRetries: 3 },
        );
        const parsed = data.map(parseCompetitionDate);
        if (!controller.signal.aborted) {
          setCompetition(parsed.find((c) => c.id === competitionId) ?? null);
        }
      } catch {
        // non-critical — HeroPanel gracefully handles null
      }
    };

    void loadCompetition();

    return () => {
      controller.abort();
    };
  }, [competitionId]);

  useEffect(() => {
    if (!competitionId || leaderboardsState.status !== "success") {
      return;
    }

    const notesLeaderboard = leaderboardsState.data.find(
      (item) => item.name.trim() === "Event Notes",
    );

    if (!notesLeaderboard) {
      return;
    }

    const controller = new AbortController();

    const loadEventNotes = async () => {
      try {
        const payload = await retryWithBackoff(
          (signal) =>
            fetchLeaderboard(
              competitionId,
              String(notesLeaderboard.id),
              signal,
            ),
          controller.signal,
          { maxRetries: 2 },
        );

        if (!controller.signal.aborted && payload.items.length > 0) {
          setEventNotes(extractNotesText(payload));
        }
      } catch {
        // non-critical — event notes are supplementary
      }
    };

    void loadEventNotes();

    return () => {
      controller.abort();
    };
  }, [competitionId, leaderboardsState]);

  const isDevelopment =
    typeof window !== "undefined" && window.location.hostname === "localhost";
  const handleCompetitionUpdate = useCallback(
    (newCompetition: Competition) => {
      setCompetition(newCompetition);
      const isLive = newCompetition.active === CompetitionStatus.Live;
      const isToday = isCompetitionToday(newCompetition);
      if (!isLive || (!isToday && !isDevelopment)) {
        setStreamResults(false);
      }
    },
    [isDevelopment],
  );

  // Only enable SignalR streaming if the competition is live and happening today
  // In development, skip the today check to allow testing with any event
  const isCompetitionLive = competition?.active === CompetitionStatus.Live;
  const isToday = isCompetitionToday(competition);
  const enableStreaming =
    streamResults && isCompetitionLive && (isToday || isDevelopment);

  useLeaderboardStream(
    competitionId,
    leaderboardId,
    enableStreaming,
    handleRowUpdate,
    handleColumnUpdate,
    handleCompetitionUpdate,
  );

  const leaderboards =
    leaderboardsState.status === "success" ? leaderboardsState.data : [];

  const selectedLeaderboard =
    leaderboards.find((item) => String(item.id) === leaderboardId) ?? null;

  const visibleRows = useMemo(() => {
    if (leaderboardState.status !== "success") {
      return [];
    }

    return filterLeaderboardRows(leaderboardState.data.items, filters);
  }, [filters, leaderboardState]);

  const classOptions = useMemo(() => {
    if (leaderboardState.status !== "success") {
      return [];
    }

    return getLeaderboardClassOptions(leaderboardState.data.items);
  }, [leaderboardState]);

  const dataRowCount =
    visibleRows.length - visibleRows.filter(isSectionRow).length;
  const loadingLeaderboards = leaderboardsState.status === "loading";
  const error =
    leaderboardsState.status === "error"
      ? leaderboardsState.error
      : leaderboardState.status === "error"
        ? leaderboardState.error
        : null;
  const resultColumns =
    leaderboardState.status === "success" ? leaderboardState.data.columns : [];

  const handleToggleFavourite = useCallback(
    (entry: string) => {
      const willBeFavourite = !isFavourite(entry);
      if (willBeFavourite && notificationPermission === "default") {
        void requestPermission();
      }
      toggleFavourite(entry);
    },
    [isFavourite, toggleFavourite, notificationPermission, requestPermission],
  );

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  return (
    <>
      <Navbar />
      <Section>
        <Container>
          <HeroPanel selectedCompetition={competition} siteName={siteName} />
          <Columns>
            <Columns.Column size={4}>
              <ControlsPanel
                leaderboards={leaderboards}
                leaderboardId={leaderboardId}
                filters={filters}
                classOptions={classOptions}
                streamResults={streamResults}
                loadingLeaderboards={loadingLeaderboards}
                isBusy={isBusy}
                isCompetitionLive={isCompetitionLive}
                isCompetitionToday={isToday}
                onLeaderboardChange={changeLeaderboard}
                onFilterChange={handleFilterChange}
                onStreamResultsChange={setStreamResults}
                onResetFilters={() => setFilters(initialFilters)}
                onRefresh={refresh}
              />
            </Columns.Column>
            <Columns.Column size={8}>
              <EventNotesPanel notes={eventNotes} />
              <ResultsPanel
                selectedLeaderboardName={selectedLeaderboard?.name}
                isBusy={isBusy}
                error={error}
                dataRowCount={dataRowCount}
                lastUpdateTime={lastUpdateTime}
                columns={resultColumns}
                visibleRows={visibleRows}
                leaderboardLoaded={leaderboardState.status === "success"}
                isFavourite={isFavourite}
                onToggleFavourite={handleToggleFavourite}
              />
            </Columns.Column>
          </Columns>
        </Container>
        <Footer />
      </Section>
    </>
  );
};

export default CompetitionPage;

export const query = graphql`
  query CompetitionPageQuery {
    allCompetitionSiteName {
      nodes {
        competitionId
        siteName
      }
    }
  }
`;

export const Head: HeadFC<object, { competitionId: string }> = ({ params }) => (
  <SeoHead
    title={`Competition ${params.competitionId} · Timing App Lite`}
    description="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    path={`/competition/${params.competitionId}`}
  />
);
