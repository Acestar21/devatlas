// Steam app IDs for games that have a Steam header image. Verify each by opening the URL.
const STEAM_APP_IDS: Record<string, number> = {
	"counter-strike 2": 730,
	"overwatch 2": 2357570,
	"apex legends": 1172470,
	"elden ring": 1245620,
	"rocket league": 252950,
};

export function gameArtUrl(name: string): string | null {
	const id = STEAM_APP_IDS[name.trim().toLowerCase()];
	return id
		? `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`
		: null;
}
