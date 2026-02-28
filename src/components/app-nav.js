"use client";

import { useEffect } from "react";
import Link from "next/link";
import { NAV_CONFIG } from "../config/nav-config";

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
      {NAV_CONFIG.filter((item) => item.visible).map((item) => {
        if (!item.enabled) {
          return (
            <span
              key={item.id}
              className="app-nav__item app-nav__item--disabled"
              aria-disabled="true"
            >
              {item.label}
              {item.disabledLabel ? (
                <span className="app-nav__item-meta">{item.disabledLabel}</span>
              ) : null}
            </span>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`app-nav__item${current === item.href ? " app-nav__item--active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
      <button type="button" className="theme-toggle vo-btn-outline" onClick={handleThemeToggle}>
        Toggle theme
      </button>
    </nav>
  );
}
