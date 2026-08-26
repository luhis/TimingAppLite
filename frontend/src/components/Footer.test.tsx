import * as React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Footer } from "./Footer";

describe("Footer", () => {
  test("renders without crashing", () => {
    const { getByText } = render(<Footer />);
    expect(getByText("Timing App Lite")).toBeInTheDocument();
  });
});
