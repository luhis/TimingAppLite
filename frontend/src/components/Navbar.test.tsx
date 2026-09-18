import * as React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  test("shows an install option when the browser fires beforeinstallprompt", async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    const event = new CustomEvent("beforeinstallprompt", {
      cancelable: true,
      detail: {
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
        platforms: ["web"],
      },
    });

    render(<Navbar />);
    act(() => {
      window.dispatchEvent(event);
    });

    const installButton = await screen.findByRole("button", {
      name: /install pwa/i,
    });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  });
});
