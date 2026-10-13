import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

/**
 * The browser may only reach the backend areas it actually uses. Anything else (auth/*, badge,
 * future internal routes) is not reachable through this proxy even with the visitor's cookie.
 * Add a prefix here when a new client-side feature needs one.
 */
const ALLOWED_PREFIXES = new Set(["profiles", "tags", "reports", "mod", "mfa", "journal", "games", "health"]);
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/;

function isAllowed(path: string[]): boolean {
	if (path.length === 0 || !ALLOWED_PREFIXES.has(path[0])) return false;
	if (path.some((segment) => !SAFE_SEGMENT.test(segment) || segment === "." || segment === "..")) return false;
	// /profiles/<username> is public data the pages fetch server-side; the browser only needs /profiles/me/*
	return path[0] !== "profiles" || path[1] === "me";
}

async function forward(request: NextRequest, path: string[]) {
	if (!isAllowed(path)) {
		return NextResponse.json({ detail: "Not found" }, { status: 404 });
	}

	if (!process.env.NEXT_PUBLIC_API_URL) {
		return NextResponse.json({ detail: "Backend API is not configured" }, { status: 500 });
	}

	const init: RequestInit = {
		method: request.method,
		headers: { "Content-Type": "application/json" },
	};

	if (request.method !== "GET" && request.method !== "DELETE") {
		const body = await request.text();
		if (body) init.body = body;
	}

	let res: Response;
	try {
		// backendFetch adds the session cookie and the visitor's signed IP.
		// request.nextUrl.search preserves query params like ?profile_url=...&platform=...
		res = await backendFetch(`${path.join("/")}${request.nextUrl.search}`, init);
	} catch {
		return NextResponse.json({ detail: "Backend API is unavailable" }, { status: 502 });
	}

	// 204 No Content (e.g. ending a journal entry) must not carry a body
	const response =
		res.status === 204
			? new NextResponse(null, { status: 204 })
			: NextResponse.json(await res.json().catch(() => ({ detail: "Invalid backend response" })), {
					status: res.status,
				});
	const setCookie = res.headers.get("set-cookie");
	if (setCookie) response.headers.set("set-cookie", setCookie);
	return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	return forward(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	return forward(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	return forward(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	return forward(request, path);
}
