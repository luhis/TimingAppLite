import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type HeadFC } from "gatsby";
import { Columns, Container, Section } from "react-bulma-components";
import { newValidDate } from "ts-date";

import { ControlsPanel } from "../../components/ControlsPanel";
import { Footer } from "../../components/Footer";
import { HeroPanel } from "../../components/HeroPanel";
import { Navbar } from "../../components/Navbar";
import { ResultsPanel } from "../../components/ResultsPanel";
import { SeoHead } from "../../components/SeoHead";
import { useLeaderboardStream } from "../../hooks/useLeaderboardStream";
import { parseCompetitionDate } from "../../lib/dataParser";
import {
  fetchAllCompetitions,
  fetchLeaderboard,
  fetchLeaderboards,
  isAbortError,
  getErrorMessage,
} from "../../lib/leaderboardApi";
import {
  isSectionRow,
  mergeRowsByEntry,
  rowSearchText,
  stringifyCell,
} from "../../lib/leaderboardUtils";
import type { AsyncData } from "../../types/asyncData";
import {
  type Competition,
  CompetitionStatus,
  type FilterState,
  type LeaderboardColumn,
  type LeaderboardItem,
  type LeaderboardPayload,
  type LeaderboardSummary,
} from "../../types/leaderboard";

const initialFilters: FilterState = {
  query: "",
  driver: "",
  className: "",
};

const classNamesToAlwaysInclude = ["Autosolo", "Autotest", "PCA", " "];

const CompetitionPage = ({
  params,
  location,
}: {
  readonly params: { readonly competitionId: string };
  readonly location: { readonly search: string };
}) => {
  const competitionId = params.competitionId;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboardsState, setLeaderboardsState] = useState<
    AsyncData<readonly LeaderboardSummary[]>
  >({ status: "loading" });
  const [leaderboardState, setLeaderboardState] = useState<
    AsyncData<LeaderboardPayload>
  >({ status: "idle" });
  const [leaderboardId, setLeaderboardId] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [refreshTick, setRefreshTick] = useState(0);
  const [streamResults, setStreamResults] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const requestedLeaderboardId = useMemo(
    () => new URLSearchParams(location.search).get("leaderboardid") ?? "",
    [location.search],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadCompetition = async () => {
      try {
        const data = await fetchAllCompetitions(controller.signal);
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
    if (!competitionId) {
      return;
    }

    const controller = new AbortController();

    const loadLeaderboards = async () => {
      setLeaderboardsState({ status: "loading" });

      try {
        const data = await fetchLeaderboards(competitionId, controller.signal);

        if (!controller.signal.aborted) {
          setLeaderboardsState({ status: "success", data });
          setLeaderboardId((currentLeaderboardId) => {
            const preferredLeaderboard =
              data.find((item) => String(item.id) === currentLeaderboardId) ??
              data.find((item) => String(item.id) === requestedLeaderboardId) ??
              data[0];

            if (!preferredLeaderboard) {
              setLeaderboardState({ status: "idle" });
              return "";
            }

            return String(preferredLeaderboard.id);
          });
        }
      } catch (fetchError) {
        if (!controller.signal.aborted && !isAbortError(fetchError)) {
          setLeaderboardsState({
            status: "error",
            error: getErrorMessage(fetchError, "Unable to load leaderboards"),
          });
        }
      }
    };

    void loadLeaderboards();

    return () => {
      controller.abort();
    };
  }, [competitionId, requestedLeaderboardId]);

  useEffect(() => {
    if (!competitionId || !leaderboardId) {
      return;
    }

    const controller = new AbortController();

    const loadLeaderboard = async () => {
      setLeaderboardState({ status: "loading" });

      try {
        const data = await fetchLeaderboard(
          competitionId,
          leaderboardId,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          const indexedData = {
            ...data,
            items: data.items.map((item, index) => ({
              ...item,
              _index: index,
            })),
          };
          setLeaderboardState({ status: "success", data: indexedData });
        }
      } catch (fetchError) {
        if (!controller.signal.aborted && !isAbortError(fetchError)) {
          setLeaderboardState({
            status: "error",
            error: getErrorMessage(fetchError, "Unable to load results"),
          });
        }
      }
    };

    void loadLeaderboard();

    return () => {
      controller.abort();
    };
  }, [competitionId, leaderboardId, refreshTick]);

  const handleRowUpdate = useCallback((rows: readonly LeaderboardItem[]) => {
    setLastUpdateTime(new Date());
    setLeaderboardState((current) =>
      current.status === "success"
        ? {
            ...current,
            data: {
              ...current.data,
              items: mergeRowsByEntry(current.data.items, rows),
            },
          }
        : current,
    );
  }, []);

  const handleColumnUpdate = useCallback(
    (columns: readonly LeaderboardColumn[]) => {
      setLastUpdateTime(new Date());
      setLeaderboardState((current) =>
        current.status === "success"
          ? { ...current, data: { ...current.data, columns: [...columns] } }
          : current,
      );
    },
    [],
  );

  const handleCompetitionUpdate = useCallback((newCompetition: Competition) => {
    setCompetition(newCompetition);
    const isLive = newCompetition.active === CompetitionStatus.Live;
    const isToday = newCompetition.dateddmmyyyy
      ? newCompetition.dateddmmyyyy.toDateString() ===
        newValidDate().toDateString()
      : false;
    if (!isLive || !isToday) {
      setStreamResults(false);
    }
  }, []);

  // Only enable SignalR streaming if the competition is live and happening today
  const isCompetitionLive = competition?.active === CompetitionStatus.Live;
  const isToday = competition?.dateddmmyyyy
    ? competition.dateddmmyyyy.toDateString() === newValidDate().toDateString()
    : false;
  const enableStreaming = streamResults && isCompetitionLive && isToday;

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

    const leaderboard = leaderboardState.data;

    const query = filters.query.trim().toLowerCase();
    const driver = filters.driver.trim().toLowerCase();
    const className = filters.className.trim().toLowerCase();

    return leaderboard.items.filter((item) => {
      const matchesQuery = !query || rowSearchText(item).includes(query);
      const matchesDriver =
        !driver || stringifyCell(item.driver).toLowerCase().includes(driver);
      const matchesClass =
        !className ||
        classNamesToAlwaysInclude.includes(stringifyCell(item.classname)) ||
        stringifyCell(item.classname).toLowerCase() === className;

      return matchesQuery && matchesDriver && matchesClass;
    });
  }, [filters, leaderboardState]);

  const classOptions = useMemo(() => {
    if (leaderboardState.status !== "success") {
      return [];
    }

    const leaderboard = leaderboardState.data;

    const classes = leaderboard.items
      .filter((item) => item.entry !== undefined)
      .map((item) => stringifyCell(item.classname).trim())
      .filter((value) => value !== "-" && value !== "");

    return Array.from(new Set(classes)).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [leaderboardState]);

  const dataRowCount =
    visibleRows.length - visibleRows.filter(isSectionRow).length;
  const loadingLeaderboards = leaderboardsState.status === "loading";
  const loadingResults = leaderboardState.status === "loading";
  const isBusy = loadingLeaderboards || loadingResults;
  const error =
    leaderboardsState.status === "error"
      ? leaderboardsState.error
      : leaderboardState.status === "error"
        ? leaderboardState.error
        : null;
  const resultColumns =
    leaderboardState.status === "success" ? leaderboardState.data.columns : [];

  const handleLeaderboardChange = (value: string) => {
    setLeaderboardId(value);
    setLeaderboardState({ status: "idle" });
  };

  const handleFilterChange =
    (field: keyof FilterState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleClassChange = (value: string) => {
    setFilters((current) => ({ ...current, className: value }));
  };

  const refreshCurrentSelection = () => {
    if (competitionId && leaderboardId && !isBusy) {
      setRefreshTick((current) => current + 1);
    }
  };

  return (
    <>
      <Navbar />
      <Section>
        <Container>
          <HeroPanel selectedCompetition={competition} />
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
                onLeaderboardChange={handleLeaderboardChange}
                onFilterChange={handleFilterChange}
                onClassChange={handleClassChange}
                onStreamResultsChange={setStreamResults}
                onResetFilters={() => setFilters(initialFilters)}
                onRefresh={refreshCurrentSelection}
              />
            </Columns.Column>
            <Columns.Column size={8}>
              <ResultsPanel
                selectedLeaderboardName={selectedLeaderboard?.name}
                isBusy={isBusy}
                error={error}
                dataRowCount={dataRowCount}
                lastUpdateTime={lastUpdateTime}
                columns={resultColumns}
                visibleRows={visibleRows}
                leaderboardLoaded={leaderboardState.status === "success"}
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

export const Head: HeadFC<object, { competitionId: string }> = ({ params }) => (
  <SeoHead
    title={`Competition ${params.competitionId} · Timing App Lite`}
    description="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    path={`/competition/${params.competitionId}`}
  />
);
