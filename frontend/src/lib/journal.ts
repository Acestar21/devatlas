export const MAX_ACTIVE_ENTRIES = 2;
export const MAX_ENTRY_LENGTH = 280;

/** Must match GENRES in backend/app/services/journal.py. Genre is always optional. */
export const GENRES: { id: string; label: string }[] = [
	{ id: "building", label: "Building" },
	{ id: "learning", label: "Learning" },
	{ id: "shipped", label: "Shipped" },
	{ id: "reading", label: "Reading" },
	{ id: "gaming", label: "Gaming" },
	{ id: "life", label: "Life" },
	{ id: "event", label: "Event" },
	{ id: "thoughts", label: "Thoughts" },
];

export function genreLabel(id: string | null | undefined): string | null {
	return GENRES.find((genre) => genre.id === id)?.label ?? null;
}

/** "5h 12m left", "42m left", "under a minute left"; null once expired. */
export function timeLeft(expiresAt: string, now: number): string | null {
	const ms = new Date(expiresAt).getTime() - now;
	if (ms <= 0) return null;
	const minutes = Math.floor(ms / 60000);
	if (minutes < 1) return "under a minute left";
	const hours = Math.floor(minutes / 60);
	return hours > 0 ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`;
}

export function timeAgo(createdAt: string, now: number): string {
	const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	return `${Math.floor(minutes / 60)}h ago`;
}

/** Wall-clock "now" for server-rendered countdowns (kept out of components so render stays pure). */
export const nowMs = () => Date.now();
