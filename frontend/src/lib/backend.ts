import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * The ONE way server-side code (server components, route handlers) talks to the FastAPI backend.
 * It automatically:
 *   1. forwards the visitor's session cookie, so the backend knows who is asking;
 *   2. forwards the visitor's real IP, signed with HMAC, so the backend's rate limiter counts
 *      each visitor separately instead of lumping everyone behind Vercel's IPs
 *      (see backend/app/rate_limit.py for the why).
 *
 * `options.internal` additionally sends the RAW shared secret. Only the OAuth callback route
 * may use it. Never add it anywhere reachable by browser-chosen paths (e.g. the /api/proxy route).
 *
 * Browser (client component) code must NOT use this; it goes through /api/proxy/* instead.
 */
const SESSION_COOKIE_NAME = "devcard_session";

export async function backendFetch(
	path: string,
	init: RequestInit = {},
	options: { internal?: boolean } = {},
): Promise<Response> {
	const base = process.env.NEXT_PUBLIC_API_URL;
	if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");

	const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
	const outgoing = new Headers(init.headers);

	const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
	if (session && !outgoing.has("Cookie")) outgoing.set("Cookie", `${SESSION_COOKIE_NAME}=${session}`);

	const secret = process.env.INTERNAL_API_SECRET;
	if (secret) {
		const ip = requestHeaders.get("x-real-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
		if (ip) {
			outgoing.set("X-Client-IP", ip);
			outgoing.set("X-Client-IP-Signature", createHmac("sha256", secret).update(ip).digest("hex"));
		}
		if (options.internal) outgoing.set("X-Internal-Secret", secret);
	}

	return fetch(`${base}/${path.replace(/^\//, "")}`, { cache: "no-store", ...init, headers: outgoing });
}