"use client";

import { useEffect, useRef, useState } from "react";
import { getTheme, isThemeId, THEME_IDS, type ThemeId } from "@/themes/registry";

const THEMES = THEME_IDS;
type Theme = ThemeId;

export default function ThemeSwitcher({
  initialTheme = "terminal",
  mobileIcon = false,
}: {
  initialTheme?: string;
  mobileIcon?: boolean;
}) {
  const normalized = isThemeId(initialTheme) ? initialTheme : "terminal";
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      const bootstrapped = document.documentElement.dataset.theme as Theme | undefined;
      if (isThemeId(bootstrapped)) return bootstrapped;
      const saved = window.localStorage.getItem("devatlas-theme");
      if (isThemeId(saved)) return saved;
    }
    return normalized;
  });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("devatlas-theme", theme);
    document.cookie = `devatlas-theme=${theme}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      const currentIndex = THEMES.indexOf(theme);
      const nextIndex =
        event.key === "ArrowDown"
          ? (currentIndex + 1) % THEMES.length
          : (currentIndex - 1 + THEMES.length) % THEMES.length;
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, theme]);

  return (
    <div className="themeSwitcher" ref={rootRef}>
      <button ref={buttonRef} type="button" className={`themeButton${mobileIcon ? " themeButtonMobileIcon" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox" aria-label={mobileIcon ? "Choose theme" : undefined} title={mobileIcon ? "Choose theme" : undefined}>
        {mobileIcon && <svg className="themeIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10h-4Zm-5 8h.01M7 7h.01M11 6h.01M17 8h.01" /></svg>}
        <span
          suppressHydrationWarning
          className={`themeSwatch themeSwatch${theme}`}
          style={{ backgroundColor: getTheme(theme).previewColors.primary }}
          aria-hidden="true"
        />
        <span suppressHydrationWarning>{theme}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && <div className="themeMenu" role="listbox" aria-label="Choose theme">
        {THEMES.map((option, index) => <button ref={(element) => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={theme === option} className="themeOption" key={option} onClick={() => { setTheme(option); setOpen(false); buttonRef.current?.focus(); }}><span className={`themeSwatch themeSwatch${option}`} style={{ backgroundColor: getTheme(option).previewColors.primary }} aria-hidden="true" />{option}</button>)}
      </div>}
    </div>
  );
}
