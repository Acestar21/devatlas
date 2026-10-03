"use client";

import { useEffect, useState } from "react";

const THEMES = ["terminal", "coffee", "forest"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeSwitcher({
  initialTheme = "terminal",
  mobileIcon = false,
}: {
  initialTheme?: string;
  mobileIcon?: boolean;
}) {
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
      <button type="button" className={`themeButton${mobileIcon ? " themeButtonMobileIcon" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox" aria-label={mobileIcon ? "Choose theme" : undefined} title={mobileIcon ? "Choose theme" : undefined}>
        {mobileIcon && <svg className="themeIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10h-4Zm-5 8h.01M7 7h.01M11 6h.01M17 8h.01" /></svg>}
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
