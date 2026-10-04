import { modGet } from "@/lib/mod-api";
import { PendingTag } from "@/types-mod";
import TagTools from "./TagTools";
import styles from "../mod.module.css";

export default async function TagsPage({
	searchParams,
}: {
	searchParams: Promise<{ category?: string; q?: string }>;
}) {
	const { category: rawCategory, q = "" } = await searchParams;
	const category = rawCategory === "interest" ? "interest" : "stack";
	const [pending, approved] = await Promise.all([
		modGet<PendingTag[]>("mod/tags/pending"),
		modGet<{ id: number; name: string }[]>(
			`mod/tags?category=${category}&q=${encodeURIComponent(q)}`,
		),
	]);

	return (
		<>
			<h1>Tags</h1>
			<TagTools pending={pending} />

			<section className={styles.card}>
				<h2>Approved tags</h2>
				<form className={styles.row} action="/mod/tags" method="GET">
					<select
						className={styles.select}
						name="category"
						defaultValue={category}
					>
						<option value="stack">Stack</option>
						<option value="interest">Interest</option>
					</select>
					<input
						className={styles.input}
						name="q"
						defaultValue={q}
						placeholder="Filter by name"
					/>
					<button className={styles.button} type="submit">
						Filter
					</button>
				</form>
				{approved.length === 0 ? (
					<p className={styles.muted}>No matches.</p>
				) : (
					<div className={styles.chips}>
						{approved.map((tag) => (
							<span key={tag.id}>{tag.name}</span>
						))}
					</div>
				)}
				{approved.length === 100 && (
					<p className={styles.muted}>
						Showing the first 100. Narrow the filter to see others.
					</p>
				)}
			</section>
		</>
	);
}
