import * as React from "react";
import { Box, Heading, Notification } from "react-bulma-components";
import type { LeaderboardColumn, LeaderboardItem } from "../types/leaderboard";
import { isSectionRow, stringifyCell } from "../lib/leaderboardUtils";

type ResultsPanelProps = {
  readonly selectedLeaderboardName: string | undefined;
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly dataRowCount: number;
  readonly lastUpdateTime: Date | null;
  readonly columns: readonly LeaderboardColumn[];
  readonly visibleRows: readonly LeaderboardItem[];
  readonly leaderboardLoaded: boolean;
};

export const ResultsPanel = ({
  selectedLeaderboardName,
  isBusy,
  error,
  dataRowCount,
  lastUpdateTime,
  columns,
  visibleRows,
  leaderboardLoaded,
}: ResultsPanelProps) => (
  <Box>
    <div className="is-flex is-justify-content-space-between is-align-items-end is-flex-wrap-wrap mb-4">
      <div>
        <p className="has-text-uppercase has-text-weight-semibold has-text-link-dark is-size-7 mb-2">
          Results
        </p>
        <Heading renderAs="h2" size={3} className="mb-0">
          {selectedLeaderboardName ?? "Leaderboard results"}
        </Heading>
      </div>
      <div className="has-text-right">
        <p className="has-text-grey is-size-7">
          {isBusy ? "Loading live data" : `${dataRowCount} result rows`}
        </p>
        <p className="has-text-grey is-size-7">
          {lastUpdateTime
            ? `Last update ${lastUpdateTime.toLocaleTimeString()}`
            : "No updates yet"}
        </p>
      </div>
    </div>

    {error ? <Notification color="danger">{error}</Notification> : null}
    {isBusy ? (
      <Notification color="light">
        Fetching competition and leaderboard data.
      </Notification>
    ) : null}

    <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <table className="table is-fullwidth is-striped is-hoverable is-narrow is-bordered">
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column.name}
                style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2 }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length > 0 ? (
            visibleRows.map((item, index) => {
              if (isSectionRow(item)) {
                return (
                  <tr key={`section-${index}`} className="section-row">
                    <td colSpan={Math.max(columns.length, 1)}>
                      {stringifyCell(item.classname)}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={`${stringifyCell(item.entry)}-${stringifyCell(item.driver)}-${index}`}
                >
                  {columns.map((column) => (
                    <td key={column.name}>
                      {stringifyCell(item[column.name])}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                className="has-text-centered has-text-grey py-6"
              >
                {leaderboardLoaded
                  ? "No rows match the current filters."
                  : "Select a competition and leaderboard to load the live results list."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Box>
);
