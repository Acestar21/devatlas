import { CalendarDay } from "@/types";

const fmt = (d: string) =>
	new Date(`${d}T00:00:00Z`).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});

export function currentStreakRange(
	weeks: CalendarDay[][],
	streak: number,
): string | null {
	if (!streak) return null;
	const days = weeks.flat();
	let end = days.length - 1;
	if (end >= 0 && days[end].count === 0) end -= 1; // today may not have activity yet
	const start = end - (streak - 1);
	if (start < 0 || end < 0) return null;
	return `${fmt(days[start].date)} - ${fmt(days[end].date)}`;
}

export function joinedAgo(joined: string): string {
	const months = Math.floor(
		(Date.now() - new Date(joined).getTime()) / (30.44 * 86400000),
	);
	if (months >= 12) {
		const y = Math.floor(months / 12);
		return `${y} year${y > 1 ? "s" : ""} ago`;
	}
	if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
	return "less than a month ago";
}
