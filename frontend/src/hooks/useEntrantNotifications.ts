import { useCallback, useState } from "react";

import type { LeaderboardItem } from "../types/leaderboard";

type NotificationPermission = "default" | "granted" | "denied";

const getPermission = (): NotificationPermission =>
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "denied";

const changedTestValues = (
  row: LeaderboardItem,
  previousRow: LeaderboardItem | undefined,
): readonly { readonly number: number; readonly value: string }[] =>
  Object.keys(row)
    .filter(
      (key) =>
        /^test\d+$/.test(key) &&
        String(row[key] ?? "") !== "" &&
        String(row[key] ?? "") !== String(previousRow?.[key] ?? ""),
    )
    .map((key) => ({
      number: Number(key.slice(4)),
      value: String(row[key]),
    }));

export const useEntrantNotifications = () => {
  const [permission, setPermission] =
    useState<NotificationPermission>(getPermission);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted";
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      return "denied";
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notifyIfFavourite = useCallback(
    (
      rows: readonly LeaderboardItem[],
      isFavourite: (entry: string) => boolean,
      competitionName: string,
      previousRows: readonly LeaderboardItem[],
    ) => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        !("serviceWorker" in navigator)
      ) {
        return;
      }

      void navigator.serviceWorker.ready.then((registration) => {
        rows
          .filter((row) => {
            const entryValue = row.entry;
            return entryValue !== undefined && isFavourite(String(entryValue));
          })
          .forEach((row) => {
            const entry = String(row.entry);
            const previousRow = previousRows.find(
              (previous) =>
                previous.entry !== undefined &&
                String(previous.entry) === entry,
            );
            const testValues = changedTestValues(row, previousRow);
            if (testValues.length === 0) {
              return;
            }
            const driver =
              typeof row.driver === "string" ? row.driver : `Entry ${entry}`;
            const pos = row.pos !== undefined ? ` (P${row.pos})` : "";
            const body = testValues
              .map(
                (testVal) =>
                  `Test ${testVal.number} result in ${competitionName} — ${testVal.value}`,
              )
              .join("\n");

            void registration.showNotification(`${entry} - ${driver}${pos}`, {
              body,
              tag: `entrant-${entry}`,
            });
          });
      });
    },
    [],
  );

  return { permission, requestPermission, notifyIfFavourite };
};
