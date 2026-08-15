import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect } from "react";

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
            onRowUpdate(rows);
          }
        });

        connection.on("ReceiveColumnUpdate", (columns: LeaderboardColumn[]) => {
          if (columns.length > 0) {
            onColumnUpdate(columns);
          }
        });

        connection.on(
          "ReceiveCompetitionUpdate",
          (competition: Competition) => {
            onCompetitionUpdate(competition);
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
  }, [
    competitionId,
    leaderboardId,
    enabled,
    onRowUpdate,
    onColumnUpdate,
    onCompetitionUpdate,
  ]);
};
