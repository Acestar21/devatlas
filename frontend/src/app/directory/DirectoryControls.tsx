"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function DirectoryControls({
	initialSearch,
	initialStack,
	initialSort,
}: {
	initialSearch: string;
	initialStack: string;
	initialSort: string;
}) {
	const router = useRouter();
	const [search, setSearch] = useState(initialSearch);
	const [stack, setStack] = useState(initialStack);
	const [sort, setSort] = useState(initialSort);

	const applyFilters = () => {
		const qs = new URLSearchParams();
		if (search) qs.set("search", search);
		if (stack) qs.set("stack", stack);
		if (sort !== "newest") qs.set("sort", sort);
		router.push(`/directory?${qs.toString()}`);
	};

	return (
		<div className={styles.controls}>
			<input
				className={styles.searchInput}
				placeholder="Search by name or username..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && applyFilters()}
			/>
			<input
				className={styles.stackInput}
				placeholder="Filter by stack (e.g. Python)"
				value={stack}
				onChange={(e) => setStack(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && applyFilters()}
			/>
			<select
				className={styles.sortSelect}
				value={sort}
				onChange={(e) => setSort(e.target.value)}
			>
				<option value="newest">Newest</option>
				<option value="active">Most active</option>
			</select>
			<button className={styles.applyButton} onClick={applyFilters}>
				Apply
			</button>
		</div>
	);
}
