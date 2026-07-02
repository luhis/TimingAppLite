import type { LeaderboardItem, LeaderboardSummary } from "../types/leaderboard";

export const stringifyCell = (
  value: string | number | null | undefined,
): string => (!value && value !== 0 ? "" : String(value).trim());

export const rowSearchText = (item: LeaderboardItem): string =>
  Object.values(item)
    .map((value) => stringifyCell(value).toLowerCase())
    .join(" ");

export const isSectionRow = (item: LeaderboardItem): boolean =>
  item.classname === "" || Object.keys(item).length === 2;

const getEntryKey = (item: LeaderboardItem): string => {
  const stringified = stringifyCell(item.entry);
  return stringified === "-" ? "" : stringified;
};

export const mergeRowsByEntry = (
  existingRows: readonly LeaderboardItem[],
  incomingRows: readonly LeaderboardItem[],
): readonly LeaderboardItem[] => {
  const incomingByKey = incomingRows.reduce<Record<string, LeaderboardItem>>(
    (allRows, row) => {
      const key = getEntryKey(row);
      return key ? { ...allRows, [key]: row } : allRows;
    },
    {},
  );

  const mergedExistingRows = existingRows.map((row) => {
    const key = getEntryKey(row);
    return key ? (incomingByKey[key] ?? row) : row;
  });

  const existingKeys = mergedExistingRows.reduce<Record<string, true>>(
    (keys, row) => {
      const key = getEntryKey(row);
      return key ? { ...keys, [key]: true } : keys;
    },
    {},
  );

  const appendedRows = incomingRows.filter(
    (row) => getEntryKey(row) && !existingKeys[getEntryKey(row)],
  );

  return [...mergedExistingRows, ...appendedRows].sort(
    (a, b) => a._index - b._index,
  );
};

const HIDDEN_LEADERBOARD_NAMES = ["Event Notes", "Event List"];

export const isSelectableLeaderboard = (item: LeaderboardSummary): boolean =>
  !HIDDEN_LEADERBOARD_NAMES.includes(item.name.trim());
