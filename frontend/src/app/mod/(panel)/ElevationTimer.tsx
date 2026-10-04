"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ElevationTimer({ until }: { until: string }) {
	const router = useRouter();
	const [remaining, setRemaining] = useState<number | null>(null);

	useEffect(() => {
		const tick = () => {
			const left = Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));
			setRemaining(left);
			if (left === 0) {
				window.clearInterval(interval);
				router.refresh(); // every page re-checks access and redirects to the MFA screen
			}
		};
		const interval = window.setInterval(tick, 1000);
		const first = window.setTimeout(tick, 0);
		return () => {
			window.clearInterval(interval);
			window.clearTimeout(first);
		};
	}, [until, router]);

	if (remaining === null) return <span>Session: …</span>;
	return <span>Session ends in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>;
}