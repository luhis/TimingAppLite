import * as React from "react";
import { Heading, Notification, Table } from "react-bulma-components";

import { isSectionRow, stringifyCell } from "../lib/leaderboardUtils";
import type { LeaderboardColumn, LeaderboardItem } from "../types/leaderboard";

type ResultsPanelData = {
  readonly selectedLeaderboardName: string | undefined;
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly dataRowCount: number;
  readonly lastUpdateTime: Date | null;
  readonly columns: readonly LeaderboardColumn[];
  readonly visibleRows: readonly LeaderboardItem[];
  readonly leaderboardLoaded: boolean;
};

type ResultsPanelCallbacks = {
  readonly isFavourite: (entry: string) => boolean;
  readonly onToggleFavourite: (entry: string) => void;
};

type ResultsPanelProps = ResultsPanelData & ResultsPanelCallbacks;

const stickyColumnHeader = "entry";
const classNameColumn = "classname";

const truncatedCellStyle: React.CSSProperties = {
  maxWidth: 200,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const cellStyleForColumn = (
  column: LeaderboardColumn,
): React.CSSProperties | undefined => {
  if (column.name === stickyColumnHeader) return stickyCellStyle;
  if (column.name === classNameColumn) return truncatedCellStyle;
  return undefined;
};

const bordered = {
  outline: "1px solid var(--bulma-border)",
};

const stickyBaseStyle = {
  ...bordered,
  position: "sticky" as const,
  left: 0,
  background: "var(--bulma-scheme-main)",
  boxShadow: "2px 0 6px var(--bulma-shadow)",
};

const stickyHeaderNonStickyStyle = {
  position: "sticky" as const,
  top: 0,
  background: "var(--bulma-scheme-main)",
  outline: "1px solid var(--bulma-border)",
  zIndex: 2,
};

const stickyHeaderStyle = {
  ...stickyBaseStyle,
  top: 0,
  zIndex: 4,
};

const stickyCellStyle = {
  ...stickyBaseStyle,
  zIndex: 1,
};

const ResultRow = ({
  item,
  columns,
  isFavourite,
  onToggleFavourite,
}: ResultsPanelCallbacks & {
  readonly item: LeaderboardItem;
  readonly columns: readonly LeaderboardColumn[];
}) => {
  if (isSectionRow(item)) {
    return (
      <tr className="section-row">
        <td colSpan={Math.max(columns.length, 1)}>
          {stringifyCell(item.classname)}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      {columns.map((column) => {
        const isEntry = column.name === stickyColumnHeader;
        const Cell = isEntry ? "th" : "td";
        const cellText = stringifyCell(item[column.name]);
        const favourite = isEntry && cellText ? isFavourite(cellText) : false;
        return (
          <Cell
            key={column.name}
            style={cellStyleForColumn(column)}
            title={column.name === classNameColumn ? cellText : undefined}
          >
            {isEntry && cellText ? (
              <span className="is-flex is-align-items-center">
                <button
                  type="button"
                  className="p-0 mr-1"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "goldenrod",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                  onClick={() => onToggleFavourite(cellText)}
                  title={
                    favourite ? "Remove from favourites" : "Add to favourites"
                  }
                >
                  {favourite ? "★" : "☆"}
                </button>
                {cellText}
              </span>
            ) : (
              cellText
            )}
          </Cell>
        );
      })}
    </tr>
  );
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
  isFavourite,
  onToggleFavourite,
}: ResultsPanelProps) => (
  <>
    <div className="is-flex is-justify-content-space-between is-align-items-end is-flex-wrap-wrap mb-4">
      <div>
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

    {error && <Notification color="danger">{error}</Notification>}
    {isBusy && (
      <Notification color="light">
        Fetching competition and leaderboard data.
      </Notification>
    )}

    <Table.Container
      style={{ maxHeight: "80vh", overflow: "auto", ...bordered }}
      bordered
    >
      <Table striped hoverable narrow bordered className="is-fullwidth">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.name}
                style={
                  column.name === stickyColumnHeader
                    ? stickyHeaderStyle
                    : stickyHeaderNonStickyStyle
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length > 0 ? (
            visibleRows.map((item, index) => (
              <ResultRow
                key={
                  isSectionRow(item)
                    ? `section-${index}`
                    : `${stringifyCell(item.entry)}-${stringifyCell(item.driver)}-${index}`
                }
                item={item}
                columns={columns}
                isFavourite={isFavourite}
                onToggleFavourite={onToggleFavourite}
              />
            ))
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
      </Table>
    </Table.Container>
  </>
);
