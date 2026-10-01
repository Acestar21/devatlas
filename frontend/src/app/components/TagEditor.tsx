"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { proxyFetch } from "@/lib/api-client";
import styles from "./EditProfileModal.module.css";

type Tag = { id: number; name: string };

export default function TagEditor({
	category,
	label,
	initial,
	basePath,
}: {
	category: "interest" | "stack";
	label: string;
	initial: Tag[];
	basePath: string;
}) {
	const router = useRouter();
	const [tags, setTags] = useState<Tag[]>(initial);
	const [search, setSearch] = useState("");
	const [results, setResults] = useState<Tag[]>([]);
	const [unmatched, setUnmatched] = useState<string[]>([]);
	const [message, setMessage] = useState<string | null>(null);

	const reset = () => {
		setSearch("");
		setResults([]);
		setUnmatched([]);
	};

	const runSearch = async (value: string) => {
		setSearch(value);
		setMessage(null);
		const tokens = value
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		if (tokens.length === 0) {
			setResults([]);
			setUnmatched([]);
			return;
		}
		const found = await Promise.all(
			tokens.map(async (token) => {
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/tags?category=${category}&search=${encodeURIComponent(token)}`,
				);
				return {
					token,
					tags: res.ok ? ((await res.json()) as Tag[]) : [],
				};
			}),
		);
		const unique = new Map<number, Tag>();
		found.forEach((f) => f.tags.forEach((t) => unique.set(t.id, t)));
		setResults([...unique.values()]);
		setUnmatched(
			found.filter((f) => f.tags.length === 0).map((f) => f.token),
		);
	};

	const add = async (tag: Tag) => {
		try {
			await proxyFetch(`${basePath}/${tag.id}`, { method: "POST" });
			setTags((current) =>
				current.some((t) => t.id === tag.id)
					? current
					: [...current, tag],
			);
			router.refresh();
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Could not add tag.",
			);
		}
	};

	const remove = async (id: number) => {
		try {
			await proxyFetch(`${basePath}/${id}`, { method: "DELETE" });
			setTags((current) => current.filter((t) => t.id !== id));
			router.refresh();
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Could not remove tag.",
			);
		}
	};

	const addAll = async () => {
		for (const tag of results) await add(tag);
		reset();
	};

	const submitUnmatched = async () => {
		try {
			await Promise.all(
				unmatched.map((name) =>
					proxyFetch(
						`tags?name=${encodeURIComponent(name)}&category=${category}`,
						{ method: "POST" },
					),
				),
			);
			setMessage(
				`Submitted for review: ${unmatched.join(", ")}. They'll be selectable once approved.`,
			);
			reset();
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Could not submit tags.",
			);
		}
	};

	return (
		<div className={styles.field}>
			<span>{label}</span>
			<div className={styles.tagRow}>
				{tags.map((tag) => (
					<span className={styles.tag} key={tag.id}>
						{tag.name}
						<button
							onClick={() => remove(tag.id)}
							aria-label={`Remove ${tag.name}`}
						>
							×
						</button>
					</span>
				))}
			</div>
			<input
				placeholder="Search, separate multiple with commas"
				value={search}
				onChange={(event) => runSearch(event.target.value)}
			/>
			{results.length > 0 && (
				<div className={styles.results}>
					{search.includes(",") && (
						<button onClick={addAll}>Add all matching</button>
					)}
					{results.map((tag) => (
						<button
							key={tag.id}
							onClick={async () => {
								await add(tag);
								reset();
							}}
						>
							{tag.name}
						</button>
					))}
				</div>
			)}
			{unmatched.length > 0 && (
				<button
					className={styles.submitNewButton}
					onClick={submitUnmatched}
				>
					Can&apos;t find {unmatched.join(", ")} — submit for review
				</button>
			)}
			{message && <p className={styles.help}>{message}</p>}
		</div>
	);
}
