import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "gatsby";
import { Navbar as BulmaNavbar } from "react-bulma-components";

type BeforeInstallPromptDetails = {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type BeforeInstallPromptPrompt = {
  readonly prompt: () => Promise<void>;
};

type BeforeInstallPromptEvent = Event &
  BeforeInstallPromptDetails &
  BeforeInstallPromptPrompt;

const navItems = [
  { label: "Current Events", to: "/" },
  { label: "Historical Events", to: "/historical-events" },
  { label: "Event List", to: "/event-list" },
  { label: "How It Works", to: "/info" },
] as const;

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!("detail" in event)) {
        return;
      }

      const customEvent = event as CustomEvent<BeforeInstallPromptDetails>;
      const detail: BeforeInstallPromptDetails & BeforeInstallPromptPrompt =
        (customEvent.detail ?? {
          platforms: [],
          prompt: () => Promise.resolve(),
          userChoice: Promise.resolve({
            outcome: "dismissed",
            platform: "web",
          }),
        }) as BeforeInstallPromptDetails & BeforeInstallPromptPrompt;

      event.preventDefault();

      setInstallPrompt({
        ...event,
        platforms: detail.platforms,
        prompt: detail.prompt,
        userChoice: detail.userChoice,
      } satisfies BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <BulmaNavbar color="dark" active={mobileOpen}>
      <BulmaNavbar.Brand>
        <BulmaNavbar.Item renderAs={Link} to="/">
          <strong>Timing App Lite</strong>
        </BulmaNavbar.Item>
        <BulmaNavbar.Burger
          active={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        />
      </BulmaNavbar.Brand>
      <BulmaNavbar.Menu active={mobileOpen}>
        {navItems.map((item) => (
          <BulmaNavbar.Item
            key={item.to}
            renderAs={Link}
            to={item.to}
            active={currentPath === item.to}
          >
            {item.label}
          </BulmaNavbar.Item>
        ))}
        {installPrompt && (
          <button
            type="button"
            className="navbar-item"
            onClick={() => {
              void handleInstallClick();
            }}
          >
            Install PWA
          </button>
        )}
      </BulmaNavbar.Menu>
    </BulmaNavbar>
  );
};
