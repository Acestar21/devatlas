"use client";

import { useState } from "react";
import styles from "./TagList.module.css";

export default function TagList({
	tags,
	limit = 8,
}: {
	tags: string[];
	limit?: number;
}) {
	const [open, setOpen] = useState(false);
	const shown = open ? tags : tags.slice(0, limit);
	return (
		<div className={styles.wrap}>
			<ul className={styles.list}>
				{shown.map((tag) => (
					<li key={tag} className={styles.chip}>
						{tag}
					</li>
				))}
			</ul>
			{tags.length > limit && (
				<button
					type="button"
					className={styles.toggle}
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
				>
					{open ? "Show less" : `+${tags.length - limit} more`}
				</button>
			)}
		</div>
	);
}
