import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "devcard_session";

export async function POST(request: NextRequest) {
	// 303 forces the browser to GET the target. The default 307 re-POSTs to a page and fails.
	const response = NextResponse.redirect(new URL("/directory", request.url), 303);
	response.cookies.delete(SESSION_COOKIE_NAME);
	return response;
}