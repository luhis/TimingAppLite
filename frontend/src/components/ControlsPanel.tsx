import * as React from "react";
import { Box, Button, Form, Heading, Icon } from "react-bulma-components";

import { signalRHubUrl } from "../hooks/useLeaderboardStream";
import type { FilterState, LeaderboardSummary } from "../types/leaderboard";

type ControlsPanelData = {
  readonly leaderboards: readonly LeaderboardSummary[];
  readonly leaderboardId: string;
  readonly filters: FilterState;
  readonly classOptions: readonly string[];
  readonly streamResults: boolean;
  readonly loadingLeaderboards: boolean;
  readonly isBusy: boolean;
  readonly isCompetitionLive: boolean;
  readonly isCompetitionToday: boolean;
};

type ControlsPanelCallbacks = {
  readonly onLeaderboardChange: (value: string) => void;
  readonly onFilterChange: (
    field: keyof FilterState,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onClassChange: (value: string) => void;
  readonly onStreamResultsChange: (checked: boolean) => void;
  readonly onResetFilters: () => void;
  readonly onRefresh: () => void;
};

export const ControlsPanel = ({
  leaderboards,
  leaderboardId,
  filters,
  classOptions,
  streamResults,
  loadingLeaderboards,
  isBusy,
  isCompetitionLive,
  isCompetitionToday,
  onLeaderboardChange,
  onFilterChange,
  onClassChange,
  onStreamResultsChange,
  onResetFilters,
  onRefresh,
}: ControlsPanelData & ControlsPanelCallbacks) => {
  const streamingDisabled =
    !signalRHubUrl || !isCompetitionLive || !isCompetitionToday;

  return (
    <Box>
      <Heading renderAs="h2" size={4} className="mb-4">
        Refine the results.
      </Heading>

      <Form.Field>
        <Form.Label>Leaderboard</Form.Label>
        <Form.Control>
          <Form.Select
            value={leaderboardId}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onLeaderboardChange(event.target.value)
            }
            disabled={loadingLeaderboards || leaderboards.length === 0}
          >
            <option value="">Select a leaderboard</option>
            {leaderboards
              .filter(
                (item) =>
                  item.name !== "Event List" &&
                  item.name.trim() !== "Event Notes",
              )
              .map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
          </Form.Select>
        </Form.Control>
      </Form.Field>

      <Form.Field>
        <Form.Control>
          <Form.Checkbox
            checked={streamResults}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onStreamResultsChange(event.target.checked)
            }
            disabled={streamingDisabled}
          >
            Live stream results
          </Form.Checkbox>
          {streamingDisabled && (
            <span
              className="tooltip ml-2 has-tooltip-multiline"
              data-tooltip="Streaming is only available when the competition is live and happening today"
            >
              <Icon className="is-size-6">ℹ️</Icon>
            </span>
          )}
        </Form.Control>
      </Form.Field>

      <Form.Field>
        <Form.Label>Global search</Form.Label>
        <Form.Control>
          <Form.Input
            type="search"
            value={filters.query}
            onChange={onFilterChange("query")}
            placeholder="Search any result field"
          />
        </Form.Control>
      </Form.Field>

      <Form.Field>
        <Form.Label>Driver</Form.Label>
        <Form.Control>
          <Form.Input
            type="search"
            value={filters.driver}
            onChange={onFilterChange("driver")}
            placeholder="Filter by driver"
          />
        </Form.Control>
      </Form.Field>

      <Form.Field>
        <Form.Label>Class</Form.Label>
        <Form.Control>
          <Form.Select
            value={filters.className}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onClassChange(event.target.value)
            }
            disabled={classOptions.length === 0}
          >
            <option value="">All classes</option>
            {classOptions.map((classOption) => (
              <option key={classOption} value={classOption.toLowerCase()}>
                {classOption}
              </option>
            ))}
          </Form.Select>
        </Form.Control>
      </Form.Field>

      <Button.Group>
        <Button color="light" type="button" onClick={onResetFilters}>
          Reset filters
        </Button>
        <Button
          color="link"
          type="button"
          onClick={onRefresh}
          disabled={!leaderboardId || isBusy}
        >
          Refresh now
        </Button>
      </Button.Group>
    </Box>
  );
};
