import { Profile } from "@/types";

export type BoardPreview = {
	title: string;
	description: string;
	url: string | null;
	meta: string;
};

/**
 * MOCK FALLBACKS for the visual board previews.
 *
 * Replace these fallback objects with dedicated API fields when the backend
 * exposes featured projects and blog/social previews. Real pinned repositories
 * and posts are preferred and are returned before these values.
 */
const MOCK_PROJECT: BoardPreview = {
	title: "Featured project",
	description:
		"Project details will appear here once a featured repository or project field is connected.",
	url: null,
	meta: "Project preview placeholder",
};

const MOCK_POST: BoardPreview = {
	title: "A developer note",
	description:
		"Blog and social highlights will appear here when profile posts are available.",
	url: null,
	meta: "Post preview placeholder",
};

export function getFeaturedProject(profile: Profile): BoardPreview {
	const repository = profile.stats?.pinned_repos?.[0];

	if (repository) {
		return {
			title: repository.name,
			description:
				repository.description ||
				"No repository description has been added yet.",
			url: repository.url,
			meta: `${repository.stars} stars`,
		};
	}

	return MOCK_PROJECT;
}

export function getFeaturedPost(profile: Profile): BoardPreview {
	const post = profile.posts?.[0];

	if (post) {
		return {
			title: post.title,
			description:
				post.description || "Open this post to read the full entry.",
			url: post.url,
			meta: post.date || "Published post",
		};
	}

	return MOCK_POST;
}
