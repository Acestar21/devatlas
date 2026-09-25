export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export async function proxyFetch<T = unknown>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`/api/proxy/${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
	});

	const data = (await response.json().catch(() => null)) as
		| { detail?: string }
		| T
		| null;
	if (!response.ok) {
		const message =
			data && typeof data === "object" && "detail" in data && data.detail
				? data.detail
				: "The request could not be completed.";
		throw new ApiError(message, response.status);
	}

	return data as T;
}
