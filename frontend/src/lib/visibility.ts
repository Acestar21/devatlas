import { Profile, SectionVisibility } from "@/types";

export const DEFAULT_VISIBILITY: SectionVisibility = {
	github: true,
	leetcode: true,
	games: true,
	interests: true,
};

export function sectionVisibility(profile: Profile): SectionVisibility {
	return profile.section_visibility ?? DEFAULT_VISIBILITY;
}

/** A card is rendered for visitors only when its toggle is on; the owner always sees it. */
export function cardShown(profile: Profile, section: string, card: string) {
	return (
		(profile.card_visibility?.[section]?.[card] ?? true) || profile.is_owner
	);
}

/** True when the owner is looking at a card that visitors cannot see (rendered muted). */
export function cardMuted(profile: Profile, section: string, card: string) {
	return profile.card_visibility?.[section]?.[card] === false;
}
