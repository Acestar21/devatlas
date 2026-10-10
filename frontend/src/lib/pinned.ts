import { findRepoBanner, parseRepoUrl } from "@/lib/banners";
import { GithubStats } from "@/types";

export type PinnedRepo = NonNullable<GithubStats["pinned_repos"]>[number];
export interface PinnedProject extends PinnedRepo {
	banner: string | null;
}

/** Attach each pinned repo's devatlas/banner.* (or null) — probed in parallel, cached 6h. */
export async function withBanners(repos: PinnedRepo[] | undefined): Promise<PinnedProject[]> {
	return Promise.all(
		(repos ?? []).map(async (repo) => ({
			...repo,
			banner: await findRepoBanner(parseRepoUrl(repo.url)),
		})),
	);
}
