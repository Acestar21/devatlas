import { GameEntry, InterestTag, Profile, StackTag } from "@/types";

export interface InCommon {
	stack: StackTag[];
	interests: InterestTag[];
	games: GameEntry[];
	languages: string[];
	total: number;
}

const norm = (value: string) => value.trim().toLowerCase();

/**
 * What the viewer and the viewed profile share. Runs on the server from two payloads the backend
 * has already filtered: the viewed profile arrives with hidden sections stripped, and the viewer's
 * own data is only ever shown back to the viewer, so nothing here widens visibility.
 */
export function computeInCommon(profile: Profile, viewer: Profile): InCommon {
	const viewerStack = new Set(viewer.stack_tags.map((t) => t.id));
	const viewerInterests = new Set((viewer.interests ?? []).map((t) => t.id));
	const viewerGames = new Set((viewer.games ?? []).map((g) => norm(g.name)));
	const viewerLangs = new Set(
		(viewer.stats?.top_languages ?? []).map(norm),
	);

	const stack = profile.stack_tags.filter((t) => viewerStack.has(t.id));
	const interests = (profile.interests ?? []).filter((t) =>
		viewerInterests.has(t.id),
	);
	const games = (profile.games ?? []).filter((g) =>
		viewerGames.has(norm(g.name)),
	);
	const languages = (profile.stats?.top_languages ?? []).filter((l) =>
		viewerLangs.has(norm(l)),
	);

	return {
		stack,
		interests,
		games,
		languages,
		total:
			stack.length + interests.length + games.length + languages.length,
	};
}
