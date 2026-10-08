import { REQUIRED_THEME_TOKENS, type ThemeManifest } from "../types";

export const forestTheme: ThemeManifest = {
	id: "forest",
	name: "Forest",
	description: "A light green theme with a calm, natural contrast.",
	author: "DevAtlas",
	version: "1.0.0",
	previewColors: {
		background: "#e7f1e8",
		primary: "#246b42",
		card: "#f6fbf6",
	},
	builtIn: true,
	tags: ["light", "green", "calm"],
	tokens: REQUIRED_THEME_TOKENS,
};
