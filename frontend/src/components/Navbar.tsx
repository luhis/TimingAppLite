import * as React from "react";
import { useState } from "react";
import { Link } from "gatsby";
import { Navbar as BulmaNavbar } from "react-bulma-components";

const navItems = [
  { label: "Current Events", to: "/" },
  { label: "Historical Events", to: "/historical-events" },
  { label: "Event List", to: "/event-list" },
  { label: "How It Works", to: "/info" },
] as const;

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

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
      </BulmaNavbar.Menu>
    </BulmaNavbar>
  );
};
