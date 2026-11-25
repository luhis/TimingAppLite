import { useEffect, useState } from "react";

import { mapCompetitionNode, parseCompetitionDate } from "../lib/dataParser";
import { fetchAllCompetitions } from "../lib/leaderboardApi";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import type { Competition } from "../types/leaderboard";

export const useCompetitions = (
  nodes: readonly Parameters<typeof mapCompetitionNode>[0][],
): readonly Competition[] => {
  const [competitions, setCompetitions] = useState<readonly Competition[]>(() =>
    nodes.map(mapCompetitionNode),
  );

  useEffect(() => {
    const controller = new AbortController();

    const refreshCompetitions = async () => {
      try {
        const freshData = await retryWithBackoff(
          (signal) => fetchAllCompetitions(signal),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setCompetitions(freshData.map(parseCompetitionDate));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Failed to refresh competitions:", error);
        }
      }
    };

    void refreshCompetitions();
    return () => controller.abort();
  }, []);

  return competitions;
};
