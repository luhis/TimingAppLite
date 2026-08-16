import { useCallback, useState } from "react";

import type { LeaderboardItem } from "../types/leaderboard";

type NotificationPermission = "default" | "granted" | "denied";

const getPermission = (): NotificationPermission =>
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "denied";

const latestTestValue = (row: LeaderboardItem): string | undefined => {
  const testKeys = Object.keys(row)
    .filter((k) => /^test\d+$/.test(k))
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
  const last = testKeys[testKeys.length - 1];
  return last ? String(row[last] ?? "") : undefined;
};

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
            const driver =
              typeof row.driver === "string" ? row.driver : `Entry ${entry}`;
            const pos = row.pos !== undefined ? ` (P${row.pos})` : "";
            const testVal = latestTestValue(row);
            const body = testVal
              ? `New result in ${competitionName} — ${testVal}`
              : `New result in ${competitionName}`;

            void registration.showNotification(`${driver}${pos}`, {
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
