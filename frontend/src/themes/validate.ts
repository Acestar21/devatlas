import { getTheme, THEMES } from "./registry";
import { REQUIRED_THEME_TOKENS, type ThemeManifest } from "./types";

function hexToRgb(value: string): [number, number, number] | null {
	const hex = value.replace("#", "");
	if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
	];
}

function luminance(value: string): number | null {
	const rgb = hexToRgb(value);
	if (!rgb) return null;
	const channels = rgb.map((channel) => {
		const normalized = channel / 255;
		return normalized <= 0.03928
			? normalized / 12.92
			: ((normalized + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number | null {
	const firstLuminance = luminance(first);
	const secondLuminance = luminance(second);
	if (firstLuminance === null || secondLuminance === null) return null;
	const lighter = Math.max(firstLuminance, secondLuminance);
	const darker = Math.min(firstLuminance, secondLuminance);
	return (lighter + 0.05) / (darker + 0.05);
}

export function validateTheme(theme: ThemeManifest): string[] {
	const errors: string[] = [];
	if (!theme.id || !theme.name || !theme.version || !theme.author) {
		errors.push(`${theme.id || "unknown"} is missing required manifest fields.`);
	}

	for (const token of REQUIRED_THEME_TOKENS) {
		if (!theme.tokens.includes(token)) {
			errors.push(`${theme.id} is missing ${token}.`);
		}
	}

	const primaryContrast = contrastRatio(theme.previewColors.primary, theme.previewColors.background);
	if (primaryContrast !== null && primaryContrast < 3) {
		errors.push(`${theme.id} preview accent contrast is below 3:1.`);
	}

	return errors;
}

export function validateThemes(): string[] {
	return THEMES.flatMap(validateTheme);
}

export function assertValidThemes(): void {
	const errors = validateThemes();
	if (errors.length > 0) {
		throw new Error(errors.join("\n"));
	}
	if (getTheme(undefined).id !== "terminal") {
		throw new Error("The default theme must be terminal.");
	}
}
