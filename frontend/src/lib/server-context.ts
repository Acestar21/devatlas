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