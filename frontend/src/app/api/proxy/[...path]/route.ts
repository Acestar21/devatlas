import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

async function forward(request: NextRequest, path: string[]) {
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

	const data = await res.json().catch(() => ({ detail: "Invalid backend response" }));
	const response = NextResponse.json(data, { status: res.status });
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