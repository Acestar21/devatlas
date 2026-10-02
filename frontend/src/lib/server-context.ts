import { cookies } from "next/headers";
import { Profile } from "@/types";

export async function getSessionCookieValue(): Promise<string | null> {
	return (await cookies()).get("devcard_session")?.value || null;
}

export async function getThemeCookie(): Promise<string | null> {
	return (await cookies()).get("devatlas-theme")?.value || null;
}

export function sessionHeaders(sessionCookie: string | null): HeadersInit {
	return sessionCookie ? { Cookie: `devcard_session=${sessionCookie}` } : {};
}

export async function fetchViewer(): Promise<Profile | null> {
	const sessionCookie = await getSessionCookieValue();
	if (!sessionCookie) return null;
	const response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`,
		{
			cache: "no-store",
			headers: sessionHeaders(sessionCookie),
		},
	);
	return response.ok ? response.json() : null;
}
