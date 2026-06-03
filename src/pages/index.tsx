import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLeaderboardStream } from "../hooks/useLeaderboardStream";

import { Columns, Container, Section } from "react-bulma-components";
import {
  fetchAllCompetitions,
  fetchLeaderboard,
  fetchLeaderboards,
} from "../lib/leaderboardApi";
import {
  type Competition,
  type FilterState,
  type LeaderboardColumn,
  type LeaderboardItem,
  type LeaderboardPayload,
  type LeaderboardSummary,
} from "../types/leaderboard";
import {
  isSectionRow,
  mergeRowsByEntry,
  rowSearchText,
  stringifyCell,
} from "../lib/leaderboardUtils";
import { ControlsPanel } from "../components/ControlsPanel";
import { HeroPanel } from "../components/HeroPanel";
import { ResultsPanel } from "../components/ResultsPanel";

import "bulma/css/bulma.min.css";

const initialFilters: FilterState = {
  query: "",
  driver: "",
  className: "",
};

const IndexPage: React.FC<PageProps> = ({ location }) => {
  const [competitions, setCompetitions] = useState<readonly Competition[]>([]);
  const [leaderboards, setLeaderboards] = useState<
    readonly LeaderboardSummary[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(
    null,
  );
  const [competitionId, setCompetitionId] = useState("");
  const [leaderboardId, setLeaderboardId] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [streamResults, setStreamResults] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const requestedCompetitionId = queryParams.get("competitionid") ?? "";
  const requestedLeaderboardId = queryParams.get("leaderboardid") ?? "";

  useEffect(() => {
    const controller = new AbortController();

    const loadCompetitions = async () => {
      setLoadingCompetitions(true);
      setError(null);

      try {
        const data = await fetchAllCompetitions(controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setCompetitions(data);

        const preferredCompetition =
          data.find((item) => item.id === requestedCompetitionId) ?? data[0];

        if (!preferredCompetition) {
          setCompetitionId("");
          setLeaderboardId("");
          setLeaderboards([]);
          setLeaderboard(null);
          return;
        }

        setCompetitionId(preferredCompetition.id);
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
          setLoadingCompetitions(false);
        }
      }
    };

    void loadCompetitions();

    return () => {
      controller.abort();
    };
  }, [requestedCompetitionId]);

  useEffect(() => {
    if (!competitionId) {
      return;
    }

    const controller = new AbortController();

    const loadLeaderboards = async () => {
      setLoadingLeaderboards(true);
      setError(null);

      try {
        const data = await fetchLeaderboards(competitionId, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setLeaderboards(data);
        setLeaderboardId((currentLeaderboardId) => {
          const preferredLeaderboard =
            data.find((item) => String(item.id) === currentLeaderboardId) ??
            data.find((item) => String(item.id) === requestedLeaderboardId) ??
            data[0];

          if (!preferredLeaderboard) {
            setLeaderboard(null);
            return "";
          }

          return String(preferredLeaderboard.id);
        });
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
              : "Unable to load leaderboards",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingLeaderboards(false);
        }
      }
    };

    void loadLeaderboards();

    return () => {
      controller.abort();
    };
  }, [competitionId, requestedLeaderboardId, refreshTick]);

  useEffect(() => {
    if (!competitionId || !leaderboardId) {
      return;
    }

    const controller = new AbortController();

    const loadLeaderboard = async () => {
      setLoadingResults(true);
      setError(null);

      try {
        const data = await fetchLeaderboard(
          competitionId,
          leaderboardId,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setLeaderboard(data);
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
              : "Unable to load results",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingResults(false);
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
    setLeaderboard((current) => {
      if (!current) {
        return current;
      }

      return { ...current, items: mergeRowsByEntry(current.items, rows) };
    });
  }, []);

  const handleColumnUpdate = useCallback(
    (columns: readonly LeaderboardColumn[]) => {
      setLastUpdateTime(new Date());
      setLeaderboard((current) => {
        if (!current) {
          return current;
        }

        return { ...current, columns: [...columns] };
      });
    },
    [],
  );

  useLeaderboardStream(
    competitionId,
    leaderboardId,
    streamResults,
    handleRowUpdate,
    handleColumnUpdate,
  );

  const selectedCompetition =
    competitions.find((item) => item.id === competitionId) ?? null;
  const selectedLeaderboard =
    leaderboards.find((item) => String(item.id) === leaderboardId) ?? null;

  const visibleRows = useMemo(() => {
    if (!leaderboard) {
      return [];
    }

    const query = filters.query.trim().toLowerCase();
    const driver = filters.driver.trim().toLowerCase();
    const className = filters.className.trim().toLowerCase();

    return leaderboard.items.filter((item) => {
      const matchesQuery = !query || rowSearchText(item).includes(query);
      const matchesDriver =
        !driver || stringifyCell(item.driver).toLowerCase().includes(driver);
      const matchesClass =
        !className || stringifyCell(item.classname).toLowerCase() === className;

      return matchesQuery && matchesDriver && matchesClass;
    });
  }, [filters, leaderboard]);

  const classOptions = useMemo(() => {
    if (!leaderboard) {
      return [];
    }

    const classes = leaderboard.items
      .filter((item) => item.entry !== undefined)
      .map((item) => stringifyCell(item.classname).trim())
      .filter((value) => value !== "-" && value !== "");

    return Array.from(new Set(classes)).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [leaderboard]);

  const sectionCount = useMemo(
    () => visibleRows.filter(isSectionRow).length,
    [visibleRows],
  );
  const dataRowCount = visibleRows.length - sectionCount;
  const isBusy = loadingCompetitions || loadingLeaderboards || loadingResults;
  const resultColumns = leaderboard?.columns ?? [];

  const handleCompetitionChange = (value: string) => {
    setCompetitionId(value);
    setLeaderboards([]);
    setLeaderboardId("");
    setLeaderboard(null);
  };

  const handleLeaderboardChange = (value: string) => {
    setLeaderboardId(value);
    setLeaderboard(null);
  };

  const handleFilterChange =
    (field: keyof FilterState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleClassChange = (value: string) => {
    setFilters((current) => ({ ...current, className: value }));
  };

  const handleStreamResultsChange = (checked: boolean) => {
    setStreamResults(checked);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const refreshCurrentSelection = () => {
    if (!competitionId || !leaderboardId || isBusy) {
      return;
    }

    setRefreshTick((current) => current + 1);
  };

  return (
    <Section>
      <Container>
        <HeroPanel
          competitionsCount={competitions.length}
          leaderboardsCount={leaderboards.length}
          dataRowCount={dataRowCount}
          leaderboardLoaded={leaderboard !== null}
          selectedCompetition={selectedCompetition}
          selectedLeaderboard={selectedLeaderboard}
        />
        <Columns>
          <Columns.Column size={4}>
            <ControlsPanel
              competitions={competitions}
              leaderboards={leaderboards}
              competitionId={competitionId}
              leaderboardId={leaderboardId}
              filters={filters}
              classOptions={classOptions}
              streamResults={streamResults}
              loadingCompetitions={loadingCompetitions}
              loadingLeaderboards={loadingLeaderboards}
              isBusy={isBusy}
              onCompetitionChange={handleCompetitionChange}
              onLeaderboardChange={handleLeaderboardChange}
              onFilterChange={handleFilterChange}
              onClassChange={handleClassChange}
              onStreamResultsChange={handleStreamResultsChange}
              onResetFilters={resetFilters}
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
              leaderboardLoaded={leaderboard !== null}
            />
          </Columns.Column>
        </Columns>
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
