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

  const appendedRows = incomingRows.filter((row) => {
    const key = getEntryKey(row);
    return Boolean(key) && !existingKeys[key];
  });

  return [...mergedExistingRows, ...appendedRows].sort((a, b) => {
    const indexA =
      typeof a._index === "number" ? a._index : Number.MAX_SAFE_INTEGER;
    const indexB =
      typeof b._index === "number" ? b._index : Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
};
