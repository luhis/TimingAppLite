import { useCallback, useEffect, useState } from "react";

import {
  fetchLeaderboard,
  fetchLeaderboards,
  getErrorMessage,
  isAbortError,
} from "../lib/leaderboardApi";
import {
  isSelectableLeaderboard,
  mergeRowsByEntry,
} from "../lib/leaderboardUtils";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import type { AsyncData } from "../types/asyncData";
import type {
  LeaderboardColumn,
  LeaderboardItem,
  LeaderboardPayload,
  LeaderboardSummary,
} from "../types/leaderboard";
import type { useEntrantNotifications } from "./useEntrantNotifications";
import { useLeaderboardNotificationSnapshot } from "./useLeaderboardNotificationSnapshot";

export const useLeaderboardData = (
  competitionId: string,
  requestedLeaderboardId: string,
  hasFavourites: boolean,
  isFavourite: (entry: string) => boolean,
  competitionName: string,
  notifyIfFavourite: ReturnType<
    typeof useEntrantNotifications
  >["notifyIfFavourite"],
) => {
  const [leaderboardsState, setLeaderboardsState] = useState<
    AsyncData<readonly LeaderboardSummary[]>
  >({ status: "loading" });
  const [leaderboardState, setLeaderboardState] = useState<
    AsyncData<LeaderboardPayload>
  >({ status: "idle" });
  const [leaderboardId, setLeaderboardId] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const { clearSnapshot, setSnapshot, notifyUpdates } =
    useLeaderboardNotificationSnapshot(
      competitionId,
      leaderboardId,
      hasFavourites,
      isFavourite,
      competitionName,
      notifyIfFavourite,
    );

  useEffect(() => {
    if (!competitionId) {
      return;
    }

    const controller = new AbortController();
    const loadLeaderboards = async () => {
      setLeaderboardsState({ status: "loading" });
      try {
        const data = await retryWithBackoff(
          (signal) => fetchLeaderboards(competitionId, signal),
          controller.signal,
          { maxRetries: 3 },
        );
        if (!controller.signal.aborted) {
          setLeaderboardsState({ status: "success", data });
          const selectableLeaderboards = data.filter(isSelectableLeaderboard);
          setLeaderboardId((currentLeaderboardId) => {
            const preferredLeaderboard =
              data.find((item) => String(item.id) === currentLeaderboardId) ??
              data.find((item) => String(item.id) === requestedLeaderboardId) ??
              selectableLeaderboards[0];
            if (!preferredLeaderboard) {
              setLeaderboardState({ status: "idle" });
              return "";
            }
            return String(preferredLeaderboard.id);
          });
        }
      } catch (error) {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setLeaderboardsState({
            status: "error",
            error: getErrorMessage(error, "Unable to load leaderboards"),
          });
        }
      }
    };

    void loadLeaderboards();
    return () => controller.abort();
  }, [competitionId, requestedLeaderboardId]);

  useEffect(() => {
    if (!competitionId || !leaderboardId) {
      return;
    }

    clearSnapshot();
    const controller = new AbortController();
    const loadLeaderboard = async () => {
      setLeaderboardState({ status: "loading" });
      try {
        const data = await retryWithBackoff(
          (signal) => fetchLeaderboard(competitionId, leaderboardId, signal),
          controller.signal,
          { maxRetries: 3 },
        );
        if (!controller.signal.aborted) {
          const indexedData = {
            ...data,
            items: data.items.map((item, index) => ({
              ...item,
              _index: index,
            })),
          };
          setSnapshot(competitionId, leaderboardId, indexedData.items);
          setLeaderboardState({ status: "success", data: indexedData });
        }
      } catch (error) {
        if (!controller.signal.aborted && !isAbortError(error)) {
          setLeaderboardState({
            status: "error",
            error: getErrorMessage(error, "Unable to load results"),
          });
        }
      }
    };

    void loadLeaderboard();
    return () => controller.abort();
  }, [competitionId, leaderboardId, refreshTick, clearSnapshot, setSnapshot]);

  const handleRowUpdate = useCallback(
    (rows: readonly LeaderboardItem[]) => {
      setLastUpdateTime(new Date());
      notifyUpdates(rows);
      setLeaderboardState((current) =>
        current.status === "success"
          ? {
              ...current,
              data: {
                ...current.data,
                items: mergeRowsByEntry(current.data.items, rows),
              },
            }
          : current,
      );
    },
    [notifyUpdates],
  );

  const handleColumnUpdate = useCallback(
    (columns: readonly LeaderboardColumn[]) => {
      setLastUpdateTime(new Date());
      setLeaderboardState((current) =>
        current.status === "success"
          ? { ...current, data: { ...current.data, columns: [...columns] } }
          : current,
      );
    },
    [],
  );

  const changeLeaderboard = (value: string) => {
    setLeaderboardId(value);
    setLeaderboardState({ status: "idle" });
  };
  const isBusy =
    leaderboardsState.status === "loading" ||
    leaderboardState.status === "loading";
  const refresh = () => {
    if (competitionId && leaderboardId && !isBusy) {
      setRefreshTick((current) => current + 1);
    }
  };

  return {
    leaderboardsState,
    leaderboardState,
    leaderboardId,
    lastUpdateTime,
    isBusy,
    changeLeaderboard,
    refresh,
    handleRowUpdate,
    handleColumnUpdate,
  };
};
