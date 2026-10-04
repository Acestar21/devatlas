export class ApiError extends Error {
	status: number;
	code: string | null;

	constructor(message: string, status: number, code: string | null = null) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code; // machine-readable, e.g. "mfa_required"
	}
}

function describe(detail: unknown): { message: string; code: string | null } {
	const fallback = "The request could not be completed.";
	if (typeof detail === "string") return { message: detail, code: null };
	if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
		return { message: detail[0].msg.replace(/^Value error, /, ""), code: null };
	}
	if (detail && typeof detail === "object") {
		const d = detail as { code?: unknown; message?: unknown };
		return {
			message: typeof d.message === "string" ? d.message : fallback,
			code: typeof d.code === "string" ? d.code : null,
		};
	}
	return { message: fallback, code: null };
}

export async function proxyFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`/api/proxy/${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
	});

	const data = (await response.json().catch(() => null)) as { detail?: unknown } | T | null;
	if (!response.ok) {
		const { message, code } = describe(data && typeof data === "object" ? (data as { detail?: unknown }).detail : null);
		throw new ApiError(message, response.status, code);
	}

	return data as T;
}