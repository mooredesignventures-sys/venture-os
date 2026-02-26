"use client";

import { useEffect } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/app/nodes", label: "Nodes" },
  { href: "/app/views", label: "Views" },
  { href: "/app/proposals", label: "Proposals" },
  { href: "/app/brainstorm", label: "Brainstorm" },
  { href: "/app/audit", label: "Audit" },
  { href: "/app/nodes#bundle-json", label: "Export" },
  { href: "/app/tour", label: "Tour" },
];

const THEME_STORAGE_KEY = "theme";

function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

export default function AppNav({ current }) {
  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      const nextTheme =
        storedTheme === "dark" || storedTheme === "light" ? storedTheme : systemTheme;

      applyTheme(nextTheme);
    } catch {
      applyTheme("dark");
    }
  }, []);

  function handleThemeToggle() {
    try {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      applyTheme("dark");
    }
  }

  return (
    <nav className="app-nav">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`app-nav__item${current === item.href ? " app-nav__item--active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
      <button type="button" className="theme-toggle vo-btn-outline" onClick={handleThemeToggle}>
        Toggle theme
      </button>
    </nav>
  );
}
