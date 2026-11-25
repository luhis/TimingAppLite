import type {
  FilterState,
  LeaderboardItem,
  LeaderboardPayloadFromApi,
  LeaderboardSummary,
} from "../types/leaderboard";

export const stringifyCell = (
  value: string | number | null | undefined,
): string => (!value && value !== 0 ? "" : String(value).trim());

export const rowSearchText = (item: LeaderboardItem): string =>
  Object.values(item)
    .map((value) => stringifyCell(value).toLowerCase())
    .join(" ");

export const isSectionRow = (item: LeaderboardItem): boolean =>
  item.classname === "" || Object.keys(item).length === 2;

const classNamesToAlwaysInclude = ["Autosolo", "Autotest", "PCA", " "];

export const filterLeaderboardRows = (
  rows: readonly LeaderboardItem[],
  filters: FilterState,
): readonly LeaderboardItem[] => {
  const query = filters.query.trim().toLowerCase();
  const driver = filters.driver.trim().toLowerCase();
  const className = filters.className.trim().toLowerCase();

  return rows.filter((item) => {
    const matchesQuery = !query || rowSearchText(item).includes(query);
    const matchesDriver =
      !driver || stringifyCell(item.driver).toLowerCase().includes(driver);
    const matchesClass =
      !className ||
      classNamesToAlwaysInclude.includes(stringifyCell(item.classname)) ||
      stringifyCell(item.classname).toLowerCase() === className;

    return matchesQuery && matchesDriver && matchesClass;
  });
};

export const getLeaderboardClassOptions = (
  rows: readonly LeaderboardItem[],
): readonly string[] => {
  const classes = rows
    .filter((item) => item.entry !== undefined)
    .map((item) => stringifyCell(item.classname).trim())
    .filter((value) => value !== "-" && value !== "");

  return Array.from(new Set(classes)).sort((left, right) =>
    left.localeCompare(right),
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

  const appendedRows = incomingRows.filter(
    (row) => getEntryKey(row) && !existingKeys[getEntryKey(row)],
  );

  return [...mergedExistingRows, ...appendedRows].sort(
    (a, b) => a._index - b._index,
  );
};

export const extractNotesText = (
  payload: LeaderboardPayloadFromApi,
): string => {
  const firstItem = payload.items[0];
  const notesColumn = payload.columns[0]?.name;
  if (!firstItem || !notesColumn) {
    return "";
  }
  return String(firstItem[notesColumn] ?? "");
};

const HIDDEN_LEADERBOARD_NAMES = ["Event Notes", "Event List"];

export const isSelectableLeaderboard = (item: LeaderboardSummary): boolean =>
  !HIDDEN_LEADERBOARD_NAMES.includes(item.name.trim());
