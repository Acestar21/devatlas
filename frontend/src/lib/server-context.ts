import { cookies } from "next/headers";

export async function getSessionCookieValue(): Promise<string | null> {
	return (await cookies()).get("devcard_session")?.value || null;
}

export async function getThemeCookie(): Promise<string | null> {
	return (await cookies()).get("devatlas-theme")?.value || null;
}

export function sessionHeaders(sessionCookie: string | null): HeadersInit {
	return sessionCookie ? { Cookie: `devcard_session=${sessionCookie}` } : {};
}
