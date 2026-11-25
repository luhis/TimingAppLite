import { useCallback, useRef } from "react";

import { mergeRowsByEntry } from "../lib/leaderboardUtils";
import type { LeaderboardItem } from "../types/leaderboard";
import type { useEntrantNotifications } from "./useEntrantNotifications";

type NotifyIfFavourite = ReturnType<
  typeof useEntrantNotifications
>["notifyIfFavourite"];

export const useLeaderboardNotificationSnapshot = (
  competitionId: string,
  leaderboardId: string,
  hasFavourites: boolean,
  isFavourite: (entry: string) => boolean,
  competitionName: string,
  notifyIfFavourite: NotifyIfFavourite,
) => {
  const snapshot = useRef<{
    readonly competitionId: string;
    readonly leaderboardId: string;
    readonly rows: readonly LeaderboardItem[];
  } | null>(null);

  const clearSnapshot = useCallback(() => {
    // eslint-disable-next-line functional/immutable-data -- discard the previous leaderboard snapshot
    snapshot.current = null;
  }, []);

  const setSnapshot = useCallback(
    (id: string, boardId: string, rows: readonly LeaderboardItem[]) => {
      // eslint-disable-next-line functional/immutable-data -- keep a synchronous baseline for streamed updates
      snapshot.current = { competitionId: id, leaderboardId: boardId, rows };
    },
    [],
  );

  const notifyUpdates = useCallback(
    (rows: readonly LeaderboardItem[]) => {
      const previous = snapshot.current;
      if (
        previous?.competitionId !== competitionId ||
        previous.leaderboardId !== leaderboardId
      ) {
        return;
      }

      if (hasFavourites) {
        notifyIfFavourite(rows, isFavourite, competitionName, previous.rows);
      }
      // eslint-disable-next-line functional/immutable-data -- keep consecutive updates in order
      snapshot.current = {
        ...previous,
        rows: mergeRowsByEntry(previous.rows, rows),
      };
    },
    [
      competitionId,
      leaderboardId,
      hasFavourites,
      isFavourite,
      competitionName,
      notifyIfFavourite,
    ],
  );

  return { clearSnapshot, setSnapshot, notifyUpdates };
};
