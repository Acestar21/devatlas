"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatLocalDateTime, formatLocalTime, formatUtcTime } from "@/lib/format";

const subscribe = () => () => {};

/**
 * A timestamp in the VIEWER's timezone. The server (and first paint) render UTC; the browser swaps in
 * local time right after hydration. useSyncExternalStore makes that swap mismatch-free.
 */
export default function LocalTime({ iso, format = "datetime" }: { iso: string; format?: "datetime" | "time" }) {
	const text = useSyncExternalStore(
		subscribe,
		() => (format === "time" ? formatLocalTime(iso) : formatLocalDateTime(iso)),
		() => (format === "time" ? formatUtcTime(iso) : formatDateTime(iso)),
	);
	return <time dateTime={iso} title={`${iso} (UTC)`}>{text}</time>;
}