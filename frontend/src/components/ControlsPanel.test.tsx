import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ControlsPanel } from "./ControlsPanel";

jest.mock("react-bulma-components", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  const bulma = jest.requireActual<typeof import("react-bulma-components")>(
    "react-bulma-components",
  );
  return {
    ...bulma,
    Form: {
      ...bulma.Form,
      Input: (props: React.ComponentProps<"input">) =>
        react.createElement("input", props),
      Select: (props: React.ComponentProps<"select">) =>
        react.createElement("select", props),
    },
  };
});

test("passes each filter's field and value to the same callback", () => {
  const onFilterChange = jest.fn();
  render(
    <ControlsPanel
      leaderboards={[]}
      leaderboardId=""
      filters={{ query: "", driver: "", className: "" }}
      classOptions={["Class A"]}
      streamResults={false}
      loadingLeaderboards={false}
      isBusy={false}
      isCompetitionLive
      isCompetitionToday
      onLeaderboardChange={jest.fn()}
      onFilterChange={onFilterChange}
      onStreamResultsChange={jest.fn()}
      onResetFilters={jest.fn()}
      onRefresh={jest.fn()}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText("Search any result field"), {
    target: { value: "search" },
  });
  fireEvent.change(screen.getByPlaceholderText("Filter by driver"), {
    target: { value: "Alice" },
  });
  fireEvent.change(screen.getByDisplayValue("All classes"), {
    target: { value: "class a" },
  });

  expect(onFilterChange.mock.calls).toEqual([
    ["query", "search"],
    ["driver", "Alice"],
    ["className", "class a"],
  ]);
});
