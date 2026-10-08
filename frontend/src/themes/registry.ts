import { coffeeTheme } from "./coffee/manifest";
import { forestTheme } from "./forest/manifest";
import { terminalTheme } from "./terminal/manifest";
import type { ThemeManifest } from "./types";

export const THEMES = [terminalTheme, coffeeTheme, forestTheme] as const satisfies readonly ThemeManifest[];
export const THEME_IDS = THEMES.map((theme) => theme.id) as [string, ...string[]];
export const DEFAULT_THEME_ID = "terminal";

export type ThemeId = (typeof THEME_IDS)[number];

export function getTheme(id: string | undefined): ThemeManifest {
	return THEMES.find((theme) => theme.id === id) ?? terminalTheme;
}

export function isThemeId(value: string | null | undefined): value is ThemeId {
	return Boolean(value && THEME_IDS.includes(value));
}
