import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";

const SESSION_COOKIE_NAME = "devcard_session";

export async function POST(request: NextRequest) {
	const session = (await cookies()).get(SESSION_COOKIE_NAME);
	if (!session || !process.env.NEXT_PUBLIC_API_URL) {
		return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
	}

	const { confirm } = (await request.json().catch(() => ({}))) as { confirm?: string };

	let res: Response;
	try {
		res = await backendFetch(`account?confirm=${encodeURIComponent(confirm ?? "")}`, { method: "DELETE" });
	} catch {
		return NextResponse.json({ detail: "Backend API is unavailable" }, { status: 502 });
	}

	const data = await res.json().catch(() => ({ detail: "Invalid backend response" }));
	const response = NextResponse.json(data, { status: res.status });
	if (res.ok) response.cookies.delete(SESSION_COOKIE_NAME);
	return response;
}