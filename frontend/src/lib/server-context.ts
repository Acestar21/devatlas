import { cookies } from "next/headers";
import { cache } from "react";
import { Profile } from "@/types";
import { backendFetch } from "@/lib/backend";

export async function getSessionCookieValue(): Promise<string | null> {
	return (await cookies()).get("devcard_session")?.value || null;
}

export async function getThemeCookie(): Promise<string | null> {
	return (await cookies()).get("devatlas-theme")?.value || null;
}

/** The logged-in visitor's own profile, or null when logged out. */
export const fetchViewer = cache(async (): Promise<Profile | null> => {
	if (!(await getSessionCookieValue())) return null;
	const response = await backendFetch("profiles/me");
	return response.ok ? response.json() : null;
});

export interface ViewerSummary {
	username: string;
	avatar_url: string | null;
	viewer_role: string;
}

/** Header-only viewer lookup: a tiny endpoint, no GitHub fetch, no full profile payload. */
export const fetchViewerSummary = cache(async (): Promise<ViewerSummary | null> => {
	if (!(await getSessionCookieValue())) return null;
	try {
		const response = await backendFetch("profiles/me/summary");
		return response.ok ? response.json() : null;
	} catch {
		return null;
	}
});
