import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ResultsPanel } from "./ResultsPanel";

jest.unmock("react-bulma-components");

test("renders section and result rows and toggles the selected favourite", () => {
  const onToggleFavourite = jest.fn();
  render(
    <ResultsPanel
      selectedLeaderboardName="Results"
      isBusy={false}
      error={null}
      dataRowCount={1}
      lastUpdateTime={null}
      columns={[
        { name: "entry", label: "Entry" },
        { name: "classname", label: "Class" },
        { name: "driver", label: "Driver" },
      ]}
      visibleRows={[
        { _index: 0, classname: "Class A" },
        { _index: 1, entry: "5", classname: "Class A", driver: "Alice" },
      ]}
      leaderboardLoaded
      isFavourite={(entry) => entry === "5"}
      onToggleFavourite={onToggleFavourite}
    />,
  );

  expect(
    screen.getByText("Class A", { selector: ".section-row td" }),
  ).toHaveAttribute("colspan", "3");
  const row = screen.getByText("Alice").closest("tr");
  expect(row).not.toBeNull();
  const button = within(row!).getByTitle("Remove from favourites");
  expect(button).toHaveTextContent("★");
  fireEvent.click(button);
  expect(onToggleFavourite).toHaveBeenCalledWith("5");
});
