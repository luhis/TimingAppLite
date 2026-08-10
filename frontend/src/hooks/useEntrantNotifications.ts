import { useCallback, useState } from "react";

import type { LeaderboardItem } from "../types/leaderboard";

type NotificationPermission = "default" | "granted" | "denied";

const getPermission = (): NotificationPermission =>
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "denied";

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
        Notification.permission !== "granted"
      ) {
        return;
      }

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

          try {
            new Notification(`${driver}${pos}`, {
              body: `New result in ${competitionName}`,
              tag: `entrant-${entry}`,
            });
          } catch {
            // Notification construction may fail in some environments
          }
        });
    },
    [],
  );

  return { permission, requestPermission, notifyIfFavourite };
};
