import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "devcard_session";

async function forward(request: NextRequest, path: string[]) {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

	const backendUrl = process.env.NEXT_PUBLIC_API_URL;
	if (!backendUrl) {
		return NextResponse.json(
			{ detail: "Backend API is not configured" },
			{ status: 500 },
		);
	}
	const targetPath = path.join("/");
	const search = request.nextUrl.search; // preserves query params like ?profile_url=...&platform=...

	const init: RequestInit = {
		method: request.method,
		headers: {
			"Content-Type": "application/json",
			Cookie: sessionCookie
				? `${SESSION_COOKIE_NAME}=${sessionCookie.value}`
				: "",
		},
	};

	if (request.method !== "GET" && request.method !== "DELETE") {
		const body = await request.text();
		if (body) init.body = body;
	}

	let res: Response;
	try {
		res = await fetch(`${backendUrl}/${targetPath}${search}`, init);
	} catch {
		return NextResponse.json(
			{ detail: "Backend API is unavailable" },
			{ status: 502 },
		);
	}

	const data = await res.json().catch(() => ({ detail: "Invalid backend response" }));

	return NextResponse.json(data, { status: res.status });
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	const { path } = await params;
	return forward(request, path);
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	const { path } = await params;
	return forward(request, path);
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	const { path } = await params;
	return forward(request, path);
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	const { path } = await params;
	return forward(request, path);
}
