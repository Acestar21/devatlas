import { REQUIRED_THEME_TOKENS, type ThemeManifest } from "../types";

export const templateTheme: ThemeManifest = {
	id: "replace-me",
	name: "Replace me",
	description: "Describe the visual character of this repo-committed theme.",
	author: "Your name",
	version: "1.0.0",
	previewColors: {
		background: "#000000",
		primary: "#000000",
		card: "#000000",
	},
	builtIn: false,
	tokens: REQUIRED_THEME_TOKENS,
};
