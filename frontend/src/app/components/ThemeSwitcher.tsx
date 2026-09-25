"use client";

import { useEffect, useState } from "react";

const THEMES = ["terminal", "coffee", "forest"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeSwitcher({ initialTheme = "terminal" }: { initialTheme?: string }) {
  const normalized = THEMES.includes(initialTheme as Theme) ? (initialTheme as Theme) : "terminal";
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      const bootstrapped = document.documentElement.dataset.theme as Theme | undefined;
      if (bootstrapped && THEMES.includes(bootstrapped)) return bootstrapped;
      const saved = window.localStorage.getItem("devatlas-theme") as Theme | null;
      if (saved && THEMES.includes(saved)) return saved;
    }
    return normalized;
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("devatlas-theme", theme);
    document.cookie = `devatlas-theme=${theme}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }, [theme]);


  return (
    <div className="themeSwitcher">
      <button type="button" className="themeButton" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox">
        <span suppressHydrationWarning className={`themeSwatch themeSwatch${theme}`} aria-hidden="true" />
        <span suppressHydrationWarning>{theme}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && <div className="themeMenu" role="listbox" aria-label="Choose theme">
        {THEMES.map((option) => <button type="button" role="option" aria-selected={theme === option} className="themeOption" key={option} onClick={() => { setTheme(option); setOpen(false); }}><span className={`themeSwatch themeSwatch${option}`} aria-hidden="true" />{option}</button>)}
      </div>}
    </div>
  );
}
