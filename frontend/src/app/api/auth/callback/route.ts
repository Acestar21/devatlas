import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "devcard_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days, must match backend

function fail(request: NextRequest, code: string, extra = "") {
	return NextResponse.redirect(new URL(`/directory?login_error=${code}${extra}`, request.url));
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const code = searchParams.get("code");
	const state = searchParams.get("state");

	if (!code || !state) return fail(request, "denied");

	const backendUrl = process.env.NEXT_PUBLIC_API_URL;
	const internalSecret = process.env.INTERNAL_API_SECRET; // no NEXT_PUBLIC_ prefix — server-only, never exposed to the browser
	if (!backendUrl || !internalSecret) return fail(request, "config");

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
		return fail(request, "backend");
	}

	if (!exchangeRes.ok) {
		const body = (await exchangeRes.json().catch(() => null)) as {
			detail?: { code?: string; days_left?: number } | string;
		} | null;
		const detail = body?.detail;
		if (typeof detail === "object" && detail?.code === "account_too_new") {
			return fail(request, "account_too_new", `&wait=${detail.days_left ?? ""}`);
		}
		if (typeof detail === "object" && detail?.code) return fail(request, detail.code);
		return fail(request, "failed");
	}

	const { session_token } = await exchangeRes.json();

	const response = NextResponse.redirect(new URL(`/directory`, request.url));

	response.cookies.set(SESSION_COOKIE_NAME, session_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SESSION_MAX_AGE_SECONDS,
		path: "/",
	});

	return response;
}