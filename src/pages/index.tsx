import * as React from "react";
import type { HeadFC, PageProps } from "gatsby";
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Columns, Container, Form, Heading, Notification, Section, Tag } from "react-bulma-components";
import "bulma/css/bulma.min.css";

type Competition = {
  id: string
  active: string
  name: string
  dateddmmyyyy: string
  provisional: string | null
  finalised: string | null
}

type LeaderboardSummary = {
  id: string | number
  name: string
}

type LeaderboardColumn = {
  name: string
  label: string
}

type LeaderboardItem = Record<string, string | number | null | undefined>

type LeaderboardPayload = {
  columns: LeaderboardColumn[]
  items: LeaderboardItem[]
}

type FilterState = {
  query: string
  driver: string
  club: string
  className: string
}

const API_BASE = "/api/leaderboard";

const initialFilters: FilterState = {
  query: "",
  driver: "",
  club: "",
  className: "",
};

const competitionStatusLabel = (active: string) => {
  switch (active) {
    case "0":
      return "Live";
    case "1":
      return "Scheduled";
    case "2":
      return "Finalised";
    case "3":
      return "Provisional";
    default:
      return "Open";
  }
};

const stringifyCell = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
};

const rowSearchText = (item: LeaderboardItem) =>
  Object.values(item)
    .map(value => stringifyCell(value).toLowerCase())
    .join(" ");

const isSectionRow = (item: LeaderboardItem) => {
  const meaningfulValues = Object.entries(item).filter(([, value]) => stringifyCell(value) !== "-");

  return meaningfulValues.length === 1 && Object.prototype.hasOwnProperty.call(item, "classname");
};

const formatMeta = (competition: Competition | null) => {
  if (!competition) {
    return "Waiting for live data";
  }

  if (competition.finalised) {
    return `Finalised ${competition.finalised}`;
  }

  if (competition.provisional) {
    return `Provisional ${competition.provisional}`;
  }

  return `${competition.dateddmmyyyy} event feed`;
};

const IndexPage: React.FC<PageProps> = ({ location }) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [competitionId, setCompetitionId] = useState("");
  const [leaderboardId, setLeaderboardId] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedCompetitionId = queryParams.get("competitionid") ?? "";
  const requestedLeaderboardId = queryParams.get("leaderboardid") ?? "";

  useEffect(() => {
    const controller = new AbortController();

    const loadCompetitions = async () => {
      setLoadingCompetitions(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}?endpoint=live-competitions`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError(`Unable to load competitions (${response.status})`);
          return;
        }

        const data = (await response.json()) as Competition[];

        if (controller.signal.aborted) {
          return;
        }

        setCompetitions(data);

        const preferredCompetition = data.find(item => item.id === requestedCompetitionId) ?? data[0];

        if (!preferredCompetition) {
          setCompetitionId("");
          setLeaderboardId("");
          setLeaderboards([]);
          setLeaderboard(null);
          return;
        }

        setCompetitionId(preferredCompetition.id);
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load competitions");
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
        const response = await fetch(`${API_BASE}?endpoint=leaderboards&competitionId=${encodeURIComponent(competitionId)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError(`Unable to load leaderboard list (${response.status})`);
          return;
        }

        const data = (await response.json()) as LeaderboardSummary[];

        if (controller.signal.aborted) {
          return;
        }

        setLeaderboards(data);

        const preferredLeaderboard = data.find(item => String(item.id) === requestedLeaderboardId) ?? data[0];

        if (!preferredLeaderboard) {
          setLeaderboardId("");
          setLeaderboard(null);
          return;
        }

        setLeaderboardId(String(preferredLeaderboard.id));
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load leaderboards");
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
  }, [competitionId, requestedLeaderboardId]);

  useEffect(() => {
    if (!competitionId || !leaderboardId) {
      return;
    }

    const controller = new AbortController();

    const loadLeaderboard = async () => {
      setLoadingResults(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE}?endpoint=leaderboard&competitionId=${encodeURIComponent(competitionId)}&leaderboardId=${encodeURIComponent(leaderboardId)}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          setError(`Unable to load results (${response.status})`);
          return;
        }

        const data = (await response.json()) as LeaderboardPayload;

        if (!controller.signal.aborted) {
          setLeaderboard(data);
        }
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load results");
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
  }, [competitionId, leaderboardId]);

  const selectedCompetition = competitions.find(item => item.id === competitionId) ?? null;
  const selectedLeaderboard = leaderboards.find(item => String(item.id) === leaderboardId) ?? null;

  const visibleRows = useMemo(() => {
    if (!leaderboard) {
      return [];
    }

    const query = filters.query.trim().toLowerCase();
    const driver = filters.driver.trim().toLowerCase();
    const club = filters.club.trim().toLowerCase();
    const className = filters.className.trim().toLowerCase();

    return leaderboard.items.filter(item => {
      const matchesQuery = !query || rowSearchText(item).includes(query);
      const matchesDriver = !driver || stringifyCell(item.driver).toLowerCase().includes(driver);
      const matchesClub = !club || stringifyCell(item.club).toLowerCase().includes(club);
      const matchesClass = !className || stringifyCell(item.classname).toLowerCase().includes(className);

      return matchesQuery && matchesDriver && matchesClub && matchesClass;
    });
  }, [filters, leaderboard]);

  const sectionCount = useMemo(() => visibleRows.filter(isSectionRow).length, [visibleRows]);
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

  const handleFilterChange = (field: keyof FilterState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(current => ({ ...current, [field]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <Section>
      <Container>
        <Box className="mb-5">
          <Columns>
            <Columns.Column size={8}>
              <Box>
                <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-3">
                  Gatsby TypeScript leaderboard app
                </p>
                <Heading renderAs="h1" size={1} className="mb-3">
                  Live autotest results without scraping the page.
                </Heading>
                <p className="is-size-5 has-text-grey-dark">
                  This app talks directly to the Sapphire Solutions API behind the leaderboard site, surfaces the live
                  event feed, and lets you filter results quickly without leaving the page.
                </p>
                <Columns className="mt-4 is-variable is-4">
                  <Columns.Column>
                    <Box>
                      <p className="has-text-grey is-size-7">Events</p>
                      <Heading renderAs="p" size={3} className="mb-0">
                        {competitions.length || "--"}
                      </Heading>
                    </Box>
                  </Columns.Column>
                  <Columns.Column>
                    <Box>
                      <p className="has-text-grey is-size-7">Boards</p>
                      <Heading renderAs="p" size={3} className="mb-0">
                        {leaderboards.length || "--"}
                      </Heading>
                    </Box>
                  </Columns.Column>
                  <Columns.Column>
                    <Box>
                      <p className="has-text-grey is-size-7">Visible rows</p>
                      <Heading renderAs="p" size={3} className="mb-0">
                        {leaderboard ? dataRowCount : "--"}
                      </Heading>
                    </Box>
                  </Columns.Column>
                </Columns>
              </Box>
            </Columns.Column>

            <Columns.Column size={4}>
              <Box>
                <Tag color={selectedCompetition?.active === "0" ? "success" : selectedCompetition?.active === "1" ? "warning" : selectedCompetition?.active === "2" ? "info" : "light"}>
                  {competitionStatusLabel(selectedCompetition?.active ?? "")}
                </Tag>
                <Heading renderAs="h2" size={3} className="mb-2">
                  {selectedCompetition?.name ?? "Loading current event"}
                </Heading>
                <p className="mb-4">{formatMeta(selectedCompetition)}</p>
                <p className="has-text-grey is-size-7 mb-1">Board</p>
                <p className="mb-3 has-text-weight-semibold">{selectedLeaderboard?.name ?? "Waiting for leaderboard"}</p>
                <p className="has-text-grey is-size-7 mb-1">Source</p>
                <p className="has-text-weight-semibold">autotest.sapphire-solutions.co.uk/API/1</p>
              </Box>
            </Columns.Column>
          </Columns>
        </Box>

        <Columns>
          <Columns.Column size={4}>
            <Box>
              <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-3">Controls</p>
              <Heading renderAs="h2" size={4} className="mb-4">
                  Choose an event and refine the results.
              </Heading>

              <Form.Field>
                <Form.Label>Competition</Form.Label>
                <Form.Control>
                  <Form.Select value={competitionId} onChange={event => handleCompetitionChange(event.target.value)} disabled={loadingCompetitions}>
                    <option value="">Select a competition</option>
                    {competitions.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.dateddmmyyyy} · {item.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Control>
              </Form.Field>

              <Form.Field>
                <Form.Label>Leaderboard</Form.Label>
                <Form.Control>
                  <Form.Select value={leaderboardId} onChange={event => handleLeaderboardChange(event.target.value)} disabled={loadingLeaderboards || leaderboards.length === 0}>
                    <option value="">Select a leaderboard</option>
                    {leaderboards.map(item => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Control>
              </Form.Field>

              <Form.Field>
                <Form.Label>Global search</Form.Label>
                <Form.Control>
                  <Form.Input value={filters.query} onChange={handleFilterChange("query")} placeholder="Search any result field" />
                </Form.Control>
              </Form.Field>

              <Form.Field>
                <Form.Label>Driver</Form.Label>
                <Form.Control>
                  <Form.Input value={filters.driver} onChange={handleFilterChange("driver")} placeholder="Filter by driver" />
                </Form.Control>
              </Form.Field>

              <Form.Field>
                <Form.Label>Club</Form.Label>
                <Form.Control>
                  <Form.Input value={filters.club} onChange={handleFilterChange("club")} placeholder="Filter by club" />
                </Form.Control>
              </Form.Field>

              <Form.Field>
                <Form.Label>Class</Form.Label>
                <Form.Control>
                  <Form.Input value={filters.className} onChange={handleFilterChange("className")} placeholder="Filter by class" />
                </Form.Control>
              </Form.Field>

              <Form.Field kind="group">
                <Form.Control>
                  <Button color="light" type="button" onClick={resetFilters}>
                    Reset filters
                  </Button>
                </Form.Control>
              </Form.Field>
            </Box>
          </Columns.Column>

          <Columns.Column size={8}>
            <Box>
              <div className="is-flex is-justify-content-space-between is-align-items-end is-flex-wrap-wrap mb-4">
                <div>
                  <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-2">Results</p>
                  <Heading renderAs="h2" size={3} className="mb-0">
                    {selectedLeaderboard?.name ?? "Leaderboard results"}
                  </Heading>
                </div>
                <div className="has-text-right">
                  <p className="has-text-grey is-size-7">{isBusy ? "Loading live data" : `${dataRowCount} result rows`}</p>
                  <p className="has-text-grey is-size-7">{leaderboard ? `${sectionCount} section breaks` : "No board loaded"}</p>
                </div>
              </div>

              {error ? <Notification color="danger">{error}</Notification> : null}
              {isBusy ? <Notification color="light">Fetching competition and leaderboard data.</Notification> : null}

              <div className="table-container">
                <table className="table is-fullwidth is-striped is-hoverable is-narrow is-bordered">
                  <thead>
                    <tr>
                      {resultColumns.map(column => (
                        <th key={column.name}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length > 0 ? (
                      visibleRows.map((item, index) => {
                        if (isSectionRow(item)) {
                          return (
                            <tr key={`section-${index}`} className="section-row">
                              <td colSpan={Math.max(resultColumns.length, 1)}>{stringifyCell(item.classname)}</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`${stringifyCell(item.entry)}-${stringifyCell(item.driver)}-${index}`}>
                            {resultColumns.map(column => (
                              <td key={column.name}>{stringifyCell(item[column.name])}</td>
                            ))}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={Math.max(resultColumns.length, 1)} className="has-text-centered has-text-grey py-6">
                          {leaderboard ? "No rows match the current filters." : "Select a competition and leaderboard to load the live results list."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Box>
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
