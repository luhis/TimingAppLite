import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect, useRef } from "react";

import { trackException } from "../lib/appInsights";
import type {
  Competition,
  LeaderboardColumn,
  LeaderboardItem,
} from "../types/leaderboard";

export const signalRHubUrl =
  (process.env.GATSBY_BACKEND_URL ?? "") + "/hubs/leaderboard";

const withSubscriptionParams = (
  baseUrl: string,
  competitionId: string,
  leaderboardId: string,
) => {
  const url = new URL(
    baseUrl,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  url.searchParams.set("competitionId", competitionId);
  url.searchParams.set("leaderboardId", leaderboardId);
  return url.toString();
};

export const useLeaderboardStream = (
  competitionId: string,
  leaderboardId: string,
  enabled: boolean,
  onRowUpdate: (rows: readonly LeaderboardItem[]) => void,
  onColumnUpdate: (columns: readonly LeaderboardColumn[]) => void,
  onCompetitionUpdate: (competition: Competition) => void,
) => {
  const onRowUpdateRef = useRef(onRowUpdate);
  const onColumnUpdateRef = useRef(onColumnUpdate);
  const onCompetitionUpdateRef = useRef(onCompetitionUpdate);

  useEffect(() => {
    // React refs are intentionally mutated to keep the latest callback
    // without re-creating the SignalR subscription.
    // eslint-disable-next-line functional/immutable-data
    onRowUpdateRef.current = onRowUpdate;
  }, [onRowUpdate]);

  useEffect(() => {
    // eslint-disable-next-line functional/immutable-data
    onColumnUpdateRef.current = onColumnUpdate;
  }, [onColumnUpdate]);

  useEffect(() => {
    // eslint-disable-next-line functional/immutable-data
    onCompetitionUpdateRef.current = onCompetitionUpdate;
  }, [onCompetitionUpdate]);

  useEffect(() => {
    if (!competitionId || !leaderboardId || !signalRHubUrl || !enabled) {
      return;
    }

    const subscriptionPromise = (async () => {
      try {
        const connection = new HubConnectionBuilder()
          .withUrl(
            withSubscriptionParams(signalRHubUrl, competitionId, leaderboardId),
            {
              transport:
                HttpTransportType.WebSockets | HttpTransportType.LongPolling,
            },
          )
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();

        connection.on("ReceiveRowUpdate", (rows: LeaderboardItem[]) => {
          if (rows.length > 0) {
            onRowUpdateRef.current(rows);
          }
        });

        connection.on("ReceiveColumnUpdate", (columns: LeaderboardColumn[]) => {
          if (columns.length > 0) {
            onColumnUpdateRef.current(columns);
          }
        });

        connection.on(
          "ReceiveCompetitionUpdate",
          (competition: Competition) => {
            onCompetitionUpdateRef.current(competition);
          },
        );

        await connection.start();

        return connection;
      } catch (error) {
        trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            signalRHubUrl,
            competitionId,
            leaderboardId,
          },
        );
        return null;
      }
    })();

    return () => {
      void subscriptionPromise
        .then((connection) => {
          if (!connection) {
            return;
          }

          return connection.stop();
        })
        .catch((error) => {
          trackException(
            error instanceof Error ? error : new Error(String(error)),
            { signalRHubUrl, phase: "stop" },
          );
        });
    };
  }, [competitionId, leaderboardId, enabled]);
};
