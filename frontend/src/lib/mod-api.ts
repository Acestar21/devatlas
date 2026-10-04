import { notFound, redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend";

/**
 * GET a /mod (or /mfa/status) endpoint from a server component. The panel's access rules live here:
 *   not logged in / not staff / admin-only page as a moderator -> 404 (nothing is here for you)
 *   staff without a fresh MFA session                          -> the MFA screen
 * Every panel page must load its data through this, because layouts don't re-run on client navigation.
 * (redirect() and notFound() throw by design: don't wrap calls in try/catch.)
 */
export async function modGet<T>(path: string): Promise<T> {
	const response = await backendFetch(path);
	if (response.ok) return response.json() as Promise<T>;

	if (response.status === 403) {
		const body = (await response.json().catch(() => null)) as { detail?: { code?: string } | string } | null;
		if (typeof body?.detail === "object" && body.detail?.code === "mfa_required") redirect("/mod/mfa");
		notFound();
	}
	if (response.status === 401 || response.status === 404) notFound();
	throw new Error(`Moderation API error ${response.status} for ${path}`);
}