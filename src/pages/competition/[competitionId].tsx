import * as React from "react";
import { Link, type HeadFC, type PageProps } from "gatsby";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLeaderboardStream } from "../../hooks/useLeaderboardStream";

import { Columns, Container, Section } from "react-bulma-components";
import {
  fetchAllCompetitions,
  fetchLeaderboard,
  fetchLeaderboards,
  isAbortError,
  getErrorMessage,
} from "../../lib/leaderboardApi";
import {
  type Competition,
  type FilterState,
  type LeaderboardColumn,
  type LeaderboardItem,
  type LeaderboardPayload,
  type LeaderboardSummary,
} from "../../types/leaderboard";
import {
  isSectionRow,
  mergeRowsByEntry,
  rowSearchText,
  stringifyCell,
} from "../../lib/leaderboardUtils";
import { ControlsPanel } from "../../components/ControlsPanel";
import { HeroPanel } from "../../components/HeroPanel";
import { ResultsPanel } from "../../components/ResultsPanel";

import "bulma/css/bulma.min.css";

const initialFilters: FilterState = {
  query: "",
  driver: "",
  className: "",
};

const CompetitionPage: React.FC<PageProps> = ({ params, location }) => {
  const competitionId = params.competitionId;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboards, setLeaderboards] = useState<
    readonly LeaderboardSummary[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(
    null,
  );
  const [leaderboardId, setLeaderboardId] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        if (!controller.signal.aborted) {
          setCompetition(data.find((c) => c.id === competitionId) ?? null);
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
        if (!isAbortError(fetchError)) {
          setError(getErrorMessage(fetchError, "Unable to load leaderboards"));
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
        if (!isAbortError(fetchError)) {
          setError(getErrorMessage(fetchError, "Unable to load results"));
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

  const selectedLeaderboard =
    leaderboards.find((item) => String(item.id) === leaderboardId) ?? null;

  const visibleRows = useMemo(() => {
    if (!leaderboard) {
      return [];
    }

    const query = filters.query.trim().toLowerCase();
    const driver = filters.driver.trim().toLowerCase();
    const className = filters.className.trim().toLowerCase();

    const classNamesToAlwaysInclude = ["Autosolo", "Autotest", "PCA", " "];

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
  const isBusy = loadingLeaderboards || loadingResults;
  const resultColumns = leaderboard?.columns ?? [];

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
        <div className="mb-4">
          <Link to="/" className="has-text-link is-size-6">
            ← All competitions
          </Link>
        </div>
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

export default CompetitionPage;

export const Head: HeadFC<object, { competitionId: string }> = ({ params }) => (
  <>
    <title>Competition {params.competitionId} · Timing App Lite</title>
    <meta
      name="description"
      content="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    />
  </>
);
