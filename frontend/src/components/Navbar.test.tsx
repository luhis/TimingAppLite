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

jest.unmock("react-bulma-components");

describe("Navbar", () => {
  test("toggles the mobile menu without passing active to the DOM", () => {
    const consoleError = jest.spyOn(console, "error");
    try {
      render(<Navbar />);
      const burger = screen.getByRole("button");
      const menu = screen.getByText("Current Events").closest(".navbar-menu");
      expect(burger).not.toHaveClass("is-active");
      expect(menu).not.toHaveClass("is-active");

      fireEvent.click(burger);
      expect(burger).toHaveClass("is-active");
      expect(menu).toHaveClass("is-active");

      fireEvent.click(burger);
      expect(burger).not.toHaveClass("is-active");
      expect(menu).not.toHaveClass("is-active");
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

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
