"use client";

import { useState } from "react";
import type { PinnedProject } from "@/lib/pinned";
import ProjectCard from "./ProjectCard";
import { ChevronIcon } from "./icons";
import styles from "./FeaturedProject.module.css";

/** One pinned repo at a time, with prev/next. The card fills the panel height. */
export default function FeaturedProject({ projects }: { projects: PinnedProject[] }) {
	const [index, setIndex] = useState(0);
	if (projects.length === 0) return <p className={styles.empty}>No pinned repos yet.</p>;

	const current = projects[Math.min(index, projects.length - 1)];
	const go = (step: number) => setIndex((i) => (i + step + projects.length) % projects.length);

	return (
		<div className={styles.wrap}>
			<div className={styles.card}>
				<ProjectCard
					title={current.name}
					description={current.description ?? ""}
					link={current.url}
					imgSrc={current.banner}
					stars={current.stars}
				/>
			</div>
			{projects.length > 1 && (
				<div className={styles.pager}>
					<button type="button" onClick={() => go(-1)} aria-label="Previous project">
						<ChevronIcon dir="left" />
					</button>
					<span aria-live="polite">
						{index + 1} / {projects.length}
					</span>
					<button type="button" onClick={() => go(1)} aria-label="Next project">
						<ChevronIcon dir="right" />
					</button>
				</div>
			)}
		</div>
	);
}
