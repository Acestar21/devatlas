import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "devcard_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days, must match backend

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const code = searchParams.get("code");
	const state = searchParams.get("state");

	if (!code || !state) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	const backendUrl = process.env.NEXT_PUBLIC_API_URL;
	const internalSecret = process.env.INTERNAL_API_SECRET; // no NEXT_PUBLIC_ prefix — server-only, never exposed to the browser
	if (!backendUrl || !internalSecret) {
		return NextResponse.redirect(new URL("/?auth_error=configuration", request.url));
	}

	let exchangeRes: Response;
	try {
		exchangeRes = await fetch(
			`${backendUrl}/auth/github/internal/exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
			{
				method: "POST",
				headers: { "X-Internal-Secret": internalSecret },
			},
		);
	} catch {
		return NextResponse.redirect(new URL("/?auth_error=backend", request.url));
	}

	if (!exchangeRes.ok) {
		// Exchange failed (bad state, GitHub error, etc.) — send back to homepage
		return NextResponse.redirect(new URL("/", request.url));
	}

	const { session_token } = await exchangeRes.json();

	const response = NextResponse.redirect(
		new URL(`/directory`, request.url),
	);

	response.cookies.set(SESSION_COOKIE_NAME, session_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SESSION_MAX_AGE_SECONDS,
		path: "/",
	});

	return response;
}
