"use client";

import { useEffect, useRef } from "react";
import { CalendarDay } from "@/types";
import styles from "./ContributionGraph.module.css";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function level(count: number, max: number) {
	if (count <= 0) return 0;
	const r = count / max;
	return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

export default function ContributionGraph({
	weeks,
}: {
	weeks: CalendarDay[][];
}) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
	}, []);
	const max = Math.max(1, ...weeks.flat().map((d) => d.count));

	// month label goes on the first week column of each new month
	const labels: Record<number, string> = {};
	let prev = -1;
	weeks.forEach((week, w) => {
		const m = new Date(`${week[0].date}T00:00:00Z`).getUTCMonth();
		if (m !== prev) {
			labels[w] = MONTHS[m];
			prev = m;
		}
	});
	if (labels[0] && labels[1]) delete labels[0]; // avoid two labels colliding at the left edge

	return (
		<div className={styles.scroller} ref={ref}>
			<div
				className={styles.box}
				style={{ "--weeks": weeks.length } as React.CSSProperties}
			>
				<div className={styles.months}>
					{Object.entries(labels).map(([w, label]) => (
						<span key={w} style={{ gridColumn: Number(w) + 2 }}>
							{label}
						</span>
					))}
				</div>
				<div className={styles.body}>
					{DAY_LABELS.map((label, i) => (
						<span key={`l${i}`} className={styles.dayLabel}>
							{label}
						</span>
					))}
					{weeks.map((week, w) => [
						...(w === 0
							? Array.from(
									{ length: 7 - week.length },
									(_, i) => (
										<span
											key={`p${i}`}
											className={styles.pad}
										/>
									),
								)
							: []),
						...week.map((day) => (
							<span
								key={day.date}
								className={`${styles.day} ${styles[`l${level(day.count, max)}`]}`}
								title={`${day.count} contributions on ${day.date}`}
							/>
						)),
					])}
				</div>
			</div>
		</div>
	);
}
