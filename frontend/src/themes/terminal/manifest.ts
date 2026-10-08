import { REQUIRED_THEME_TOKENS, type ThemeManifest } from "../types";

export const terminalTheme: ThemeManifest = {
	id: "terminal",
	name: "Terminal",
	description: "A dark green workspace for focused developer profiles.",
	author: "DevAtlas",
	version: "1.0.0",
	previewColors: {
		background: "#06140f",
		primary: "#3fd86a",
		card: "#0b1f16",
	},
	builtIn: true,
	tags: ["dark", "green", "developer"],
	tokens: REQUIRED_THEME_TOKENS,
};
