export const REQUIRED_THEME_TOKENS = [
	"--background",
	"--foreground",
	"--card-bg",
	"--card-raised",
	"--foreground-muted",
	"--foreground-dimmed",
	"--border",
	"--border-muted",
	"--hairline",
	"--highlight",
	"--input-bg",
	"--input-border",
	"--primary",
	"--primary-foreground",
	"--secondary-bg",
	"--secondary-fg",
	"--accent-bg",
	"--accent-fg",
	"--danger",
	"--online",
	"--surface-pattern",
	"--control-radius",
	"--card-radius",
	"--shell-radius",
	"--inner-radius",
	"--shadow-card",
	"--shadow-lift",
	"--glow",
] as const;

export type ThemeToken = (typeof REQUIRED_THEME_TOKENS)[number];

export type ThemeManifest = {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	previewColors: {
		background: string;
		primary: string;
		card: string;
	};
	builtIn: boolean;
	license?: string;
	repository?: string;
	authorUrl?: string;
	tags?: string[];
	tokens: readonly ThemeToken[];
};
