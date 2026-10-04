import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

const SESSION_COOKIE_NAME = "devcard_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days, must match backend
const ACTIONS = new Set(["verify", "enroll", "lock"]); // the backend routes that return a session token

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
	const { action } = await params;
	if (!ACTIONS.has(action)) return NextResponse.json({ detail: "Not found" }, { status: 404 });

	const body = await request.text();
	let res: Response;
	try {
		res = await backendFetch(
			`mfa/${action}`,
			{ method: "POST", headers: { "Content-Type": "application/json" }, body: body || undefined },
			{ internal: true }, // these backend routes only answer to our own server
		);
	} catch {
		return NextResponse.json({ detail: "Backend API is unavailable" }, { status: 502 });
	}

	const data = (await res.json().catch(() => ({ detail: "Invalid backend response" }))) as Record<string, unknown>;
	const { session_token, ...safe } = data; // the token must never reach browser JavaScript
	const response = NextResponse.json(safe, { status: res.status });

	if (res.ok && typeof session_token === "string") {
		response.cookies.set(SESSION_COOKIE_NAME, session_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: SESSION_MAX_AGE_SECONDS,
			path: "/",
		});
	}
	return response;
}