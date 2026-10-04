"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";

/**
 * Runs one moderation action: tracks busy / error / success message, refreshes the server data
 * afterwards, and sends the user to the MFA screen if their elevated session ran out mid-action.
 * Returns true when the action succeeded.
 */
export function useRunner() {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	async function run(action: () => Promise<{ message?: string } | void>): Promise<boolean> {
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const result = await action();
			if (result && typeof result === "object" && result.message) setMessage(result.message);
			router.refresh();
			return true;
		} catch (caught) {
			if (caught instanceof ApiError && caught.code === "mfa_required") {
				router.push("/mod/mfa");
				return false;
			}
			setError(caught instanceof Error ? caught.message : "Action failed.");
			return false;
		} finally {
			setBusy(false);
		}
	}

	return { run, busy, error, message };
}