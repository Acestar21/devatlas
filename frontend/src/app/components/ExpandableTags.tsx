"use client";

import { useState } from "react";
import styles from "./ProfileCard.module.css";

/** Tag chips that show the first `limit` and a "+N more" toggle. */
export default function ExpandableTags({ tags, limit = 8 }: { tags: string[]; limit?: number }) {
	const [open, setOpen] = useState(false);
	const shown = open ? tags : tags.slice(0, limit);
	const hidden = tags.length - limit;
	return (
		<>
			<div className={styles.tags}>
				{shown.map((tag) => (
					<span key={tag} className={styles.tag}>
						{tag}
					</span>
				))}
			</div>
			{hidden > 0 && (
				<button type="button" className={styles.more} onClick={() => setOpen((v) => !v)}>
					{open ? "Show less" : `+${hidden} more`}
				</button>
			)}
		</>
	);
}
