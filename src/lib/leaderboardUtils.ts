import type { LeaderboardItem } from "../types/leaderboard";

export const stringifyCell = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value).trim();
};

export const rowSearchText = (item: LeaderboardItem): string =>
  Object.values(item)
    .map((value) => stringifyCell(value).toLowerCase())
    .join(" ");

export const isSectionRow = (item: LeaderboardItem): boolean => {
  const meaningfulValues = Object.entries(item).filter(
    ([, value]) => stringifyCell(value) !== "-",
  );

  return (
    meaningfulValues.length === 1 &&
    Object.prototype.hasOwnProperty.call(item, "classname")
  );
};

const getEntryKey = (item: LeaderboardItem): string => {
  const entry = item.entry;

  if (entry === null || entry === undefined || entry === "") {
    return "";
  }

  return String(entry);
};

export const mergeRowsByEntry = (
  existingRows: readonly LeaderboardItem[],
  incomingRows: readonly LeaderboardItem[],
): readonly LeaderboardItem[] => {
  const incomingByKey = incomingRows.reduce<Record<string, LeaderboardItem>>(
    (allRows, row) => {
      const key = getEntryKey(row);

      if (!key) {
        return allRows;
      }

      return { ...allRows, [key]: row };
    },
    {},
  );

  const mergedExistingRows = existingRows.map((row) => {
    const key = getEntryKey(row);

    if (!key) {
      return row;
    }

    return incomingByKey[key] ?? row;
  });

  const existingKeys = mergedExistingRows.reduce<Record<string, true>>(
    (keys, row) => {
      const key = getEntryKey(row);

      if (!key) {
        return keys;
      }

      return { ...keys, [key]: true };
    },
    {},
  );

  const appendedRows = incomingRows.filter((row) => {
    const key = getEntryKey(row);
    return Boolean(key) && !existingKeys[key];
  });

  return [...mergedExistingRows, ...appendedRows];
};
