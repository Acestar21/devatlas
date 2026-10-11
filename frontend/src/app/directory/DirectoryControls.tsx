"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
	const [pending, startTransition] = useTransition();
	const [search, setSearch] = useState(initialSearch);
	const [stack, setStack] = useState(initialStack);
	const [sort, setSort] = useState(initialSort);
	const searchRef = useRef<HTMLInputElement>(null);

	const filtered = Boolean(initialSearch || initialStack || initialSort !== "newest");

	const apply = (next: { search?: string; stack?: string; sort?: string } = {}) => {
		const s = (next.search ?? search).trim();
		const t = (next.stack ?? stack).trim();
		const o = next.sort ?? sort;
		const qs = new URLSearchParams();
		if (s) qs.set("search", s);
		if (t) qs.set("stack", t);
		if (o !== "newest") qs.set("sort", o);
		startTransition(() => router.push(qs.size ? `/directory?${qs}` : "/directory"));
	};

	const clear = () => {
		setSearch("");
		setStack("");
		setSort("newest");
		startTransition(() => router.push("/directory"));
	};

	// "/" jumps to search, like GitHub
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
			if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
				event.preventDefault();
				searchRef.current?.focus();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	return (
		<form
			className={styles.controls}
			role="search"
			aria-busy={pending}
			onSubmit={(event) => {
				event.preventDefault();
				apply();
			}}
		>
			<label className={styles.searchField}>
				<svg viewBox="0 0 24 24" aria-hidden="true" className={styles.searchIcon}>
					<circle cx="11" cy="11" r="6.5" />
					<path d="m20 20-4.2-4.2" />
				</svg>
				<input
					ref={searchRef}
					type="search"
					aria-label="Search by name or username"
					placeholder="Search by name or username"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
				<kbd aria-hidden="true">/</kbd>
			</label>
			<input
				className={styles.stackInput}
				aria-label="Filter by stack"
				placeholder="Stack, e.g. Python"
				value={stack}
				onChange={(event) => setStack(event.target.value)}
			/>
			<select
				className={styles.sortSelect}
				aria-label="Sort profiles"
				value={sort}
				onChange={(event) => {
					setSort(event.target.value);
					apply({ sort: event.target.value });
				}}
			>
				<option value="newest">Newest</option>
				<option value="active">Most active</option>
			</select>
			<div className={styles.controlButtons}>
				<button type="submit" className={styles.applyButton} disabled={pending}>
					{pending ? "Searching…" : "Search"}
				</button>
				{filtered && (
					<button type="button" className={styles.clearButton} onClick={clear}>
						Clear
					</button>
				)}
			</div>
		</form>
	);
}
