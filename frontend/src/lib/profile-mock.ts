/**
 * MOCK display helpers for profile chrome that the backend does not expose yet.
 *
 * Replace these with real fields when they exist, then delete this module:
 * - profile.banner_url        -> bannerUrl()
 * - profile.pronouns          -> pronounsFor()
 * - profile.custom_status     -> statusFor()
 * - profile.presence          -> presenceFor()  ("online" | "idle" | "dnd" | "offline")
 */

export function bannerUrl(username: string): string {
	return `https://picsum.photos/seed/devatlas-banner-${encodeURIComponent(username)}/1400/420`;
}

export function pronounsFor(username: string): string {
	const options = ["they/them", "he/him", "she/her", "any pronouns"];
	let hash = 0;
	for (const ch of username) hash = (hash + ch.charCodeAt(0)) % options.length;
	return options[hash];
}

export function statusFor(username: string, bio: string | null): string {
	if (bio && bio.trim().length > 12) {
		const compact = bio.trim().replace(/\s+/g, " ");
		return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
	}
	return `${username} is compiling vibes`;
}

export function presenceFor(): "online" {
	return "online";
}
