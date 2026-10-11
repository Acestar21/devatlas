import { Profile } from "@/types";

/** Set (client-side, 1 year) when the user skips or finishes setup. Nothing is stored server-side. */
export const ONBOARDED_COOKIE = "devatlas-onboarded";

/**
 * "Hasn't set anything up yet": only the GitHub-fetched stats exist. Display name is ignored
 * because it comes from GitHub at signup.
 */
export function isProfileBlank(profile: Profile): boolean {
	return (
		!profile.bio &&
		profile.stack_tags.length === 0 &&
		(profile.interests ?? []).length === 0 &&
		profile.content_links.length === 0 &&
		(profile.games ?? []).length === 0 &&
		(profile.posts ?? []).length === 0
	);
}
