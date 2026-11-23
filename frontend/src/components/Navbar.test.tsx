import * as React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { initializeInstallPrompt } from "../lib/installPrompt";
import { Navbar } from "./Navbar";

jest.unmock("react-bulma-components");

beforeAll(() => initializeInstallPrompt());
afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
});

const installEvent = (prompt: jest.Mock) => {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  // eslint-disable-next-line functional/immutable-data -- emulate the native browser event
  Object.defineProperty(event, "prompt", { value: prompt });
  return event;
};

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

  test.each(["accepted", "dismissed"])(
    "shows the browser install prompt and removes the consumed button when %s",
    async (outcome) => {
      const prompt = jest.fn().mockResolvedValue({ outcome, platform: "web" });
      const event = installEvent(prompt);

      render(<Navbar />);
      expect(screen.queryByRole("button", { name: /install pwa/i })).toBeNull();
      act(() => {
        window.dispatchEvent(event);
      });

      const installButton = screen.getByRole("button", {
        name: /install pwa/i,
      });
      expect(event.defaultPrevented).toBe(true);
      fireEvent.click(installButton);

      await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("button", { name: /install pwa/i })).toBeNull();
    },
  );

  test("retains a prompt received before rendering and across navigation", () => {
    const event = installEvent(jest.fn());
    act(() => {
      window.dispatchEvent(event);
    });

    const firstPage = render(<Navbar />);
    expect(
      screen.getByRole("button", { name: /install pwa/i }),
    ).toBeInTheDocument();
    firstPage.unmount();
    render(<Navbar />);
    expect(
      screen.getByRole("button", { name: /install pwa/i }),
    ).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("button", { name: /install pwa/i })).toBeNull();
  });

  test("reports a prompt failure and allows a new browser prompt", async () => {
    const error = new Error("Install failed");
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      render(<Navbar />);
      act(() => {
        window.dispatchEvent(installEvent(jest.fn().mockRejectedValue(error)));
      });
      fireEvent.click(screen.getByRole("button", { name: /install pwa/i }));
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Unable to display the install prompt:",
          error,
        );
      });
      expect(screen.queryByRole("button", { name: /install pwa/i })).toBeNull();

      act(() => {
        window.dispatchEvent(installEvent(jest.fn()));
      });
      expect(
        screen.getByRole("button", { name: /install pwa/i }),
      ).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});
