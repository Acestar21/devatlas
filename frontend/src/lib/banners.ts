/**
 * Banner convention (owner-controlled, lives in the owner's own GitHub repos):
 *   - profile banner:  github.com/<user>/<user>/devatlas/banner.(jpg|png|webp)
 *   - project banner:  github.com/<user>/<repo>/devatlas/banner.(jpg|png|webp)
 * We probe raw.githubusercontent.com on the server (cached) so the page knows
 * BEFORE render whether a real image exists, which lets the card pick the
 * taller "image" banner or the shorter solid-colour fallback without any
 * layout jump or browser 404 noise.
 */

const EXTENSIONS = ["jpg", "png", "webp"] as const;
const REVALIDATE_SECONDS = 6 * 60 * 60; // same cadence as the GitHub stats cache

const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

export interface RepoRef {
	owner: string;
	repo: string;
}

/** "https://github.com/owner/repo" -> { owner, repo } (null for anything else). */
export function parseRepoUrl(url: string): RepoRef | null {
	try {
		const u = new URL(url);
		if (u.hostname !== "github.com") return null;
		const [owner, repo] = u.pathname.split("/").filter(Boolean);
		if (!owner || !repo) return null;
		if (!SAFE_SEGMENT.test(owner) || !SAFE_SEGMENT.test(repo)) return null;
		return { owner, repo: repo.replace(/\.git$/, "") };
	} catch {
		return null;
	}
}

function bannerUrl({ owner, repo }: RepoRef, ext: string): string {
	return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/devatlas/banner.${ext}`;
}

async function exists(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, {
			method: "HEAD",
			next: { revalidate: REVALIDATE_SECONDS },
			signal: AbortSignal.timeout(4000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

/** The first banner image that actually exists for this repo, or null. */
export async function findRepoBanner(ref: RepoRef | null): Promise<string | null> {
	if (!ref) return null;
	const hits = await Promise.all(
		EXTENSIONS.map(async (ext) => {
			const url = bannerUrl(ref, ext);
			return (await exists(url)) ? url : null;
		}),
	);
	return hits.find(Boolean) ?? null;
}

/** Profile banner: the repo named after the user. */
export function findProfileBanner(username: string) {
	return findRepoBanner(
		SAFE_SEGMENT.test(username) ? { owner: username, repo: username } : null,
	);
}
