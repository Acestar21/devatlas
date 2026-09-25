import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "devcard_session";

export async function POST() {
    const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
}