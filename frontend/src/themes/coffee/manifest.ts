import { REQUIRED_THEME_TOKENS, type ThemeManifest } from "../types";

export const coffeeTheme: ThemeManifest = {
	id: "coffee",
	name: "Coffee",
	description: "A warm paper-like theme with grounded brown accents.",
	author: "DevAtlas",
	version: "1.0.0",
	previewColors: {
		background: "#f3ebe1",
		primary: "#7a4b2e",
		card: "#fff8ef",
	},
	builtIn: true,
	tags: ["light", "warm", "editorial"],
	tokens: REQUIRED_THEME_TOKENS,
};
