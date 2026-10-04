"use client";

import { useState } from "react";
import LocalTime from "@/app/components/LocalTime";
import { proxyFetch } from "@/lib/api-client";
import { useRunner } from "@/lib/use-runner";
import { ApprovedTag, DuplicateGroup, PendingTag } from "@/types-mod";
import styles from "../mod.module.css";

export default function TagTools({ pending, approved, duplicates, isAdmin, category: listCategory, q }: {
	pending: PendingTag[];
	approved: ApprovedTag[];
	duplicates: DuplicateGroup[];
	isAdmin: boolean;
	category: string;
	q: string;
}) {
	const { run, busy, error, message } = useRunner();
	const [category, setCategory] = useState("stack");
	const [names, setNames] = useState("");

	const addTags = async () => {
		const list = names.split(/[\n,]/).map((n) => n.trim()).filter(Boolean);
		const ok = await run(async () => {
			const result = await proxyFetch<{ added: string[]; skipped: string[] }>("mod/tags", {
				method: "POST",
				body: JSON.stringify({ names: list, category }),
			});
			return { message: `Added ${result.added.length}${result.skipped.length ? `, skipped ${result.skipped.length} that already existed` : ""}.` };
		});
		if (ok) setNames("");
	};

	const merge = (group: DuplicateGroup, keep: DuplicateGroup["tags"][number]) => {
		const others = group.tags.filter((t) => t.id !== keep.id);
		if (!window.confirm(`Keep '${keep.name}' and merge ${others.map((t) => `'${t.name}'`).join(", ")} into it? Profiles using the others move to '${keep.name}'.`)) return;
		run(() => proxyFetch<{ message: string }>("mod/tags/merge", {
			method: "POST",
			body: JSON.stringify({ keep_id: keep.id, remove_ids: others.map((t) => t.id) }),
		}));
	};

	const purge = (tag: ApprovedTag) => {
		if (!window.confirm(`Delete '${tag.name}'? It will be removed from ${tag.uses} profile(s). This can't be undone.`)) return;
		run(() => proxyFetch<{ message: string }>(`mod/tags/${tag.id}/purge`, { method: "DELETE" }));
	};

	return (
		<>
			<section className={styles.card}>
				<h2>Pending approval ({pending.length})</h2>
				<p className={styles.muted}>Submitted by users who couldn&apos;t find a tag. Approving makes it selectable for everyone. Rejecting deletes it.</p>
				{pending.length === 0 ? <p className={styles.muted}>Nothing waiting.</p> : (
					<table className={styles.table}>
						<thead><tr><th>Tag</th><th>Category</th><th>Submitted by</th><th>When</th><th /></tr></thead>
						<tbody>
							{pending.map((tag) => (
								<tr key={tag.id}>
									<td><strong>{tag.name}</strong></td>
									<td>{tag.category}</td>
									<td>{tag.submitted_by ? `@${tag.submitted_by}` : <span className={styles.muted}>deleted account</span>}</td>
									<td><LocalTime iso={tag.created_at} /></td>
									<td>
										<div className={styles.row}>
											<button className={styles.primary} disabled={busy} onClick={() => run(() => proxyFetch(`mod/tags/${tag.id}/approve`, { method: "POST" }))}>Approve</button>
											<button className={styles.danger} disabled={busy} onClick={() => run(() => proxyFetch(`mod/tags/${tag.id}`, { method: "DELETE" }))}>Reject</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			{isAdmin && (
				<section className={styles.card}>
					<h2>Duplicates ({duplicates.length})</h2>
					<p className={styles.muted}>Names that match ignoring case, like &quot;html&quot; and &quot;HTML&quot;. Pick the one to keep; the rest are merged into it and every profile using them is moved over.</p>
					{duplicates.length === 0 ? <p className={styles.muted}>No duplicates found.</p> : duplicates.map((group) => (
						<div className={styles.dupGroup} key={group.tags.map((t) => t.id).join("-")}>
							<span className={styles.muted}>{group.category}</span>
							{group.tags.map((tag) => (
								<div className={styles.row} key={tag.id}>
									<strong>{tag.name}</strong>
									<span className={styles.muted}>{tag.status} · {tag.uses} use{tag.uses === 1 ? "" : "s"}</span>
									<button className={styles.button} disabled={busy || tag.status !== "approved"} onClick={() => merge(group, tag)}>Keep this one</button>
								</div>
							))}
						</div>
					))}
				</section>
			)}

			<section className={styles.card}>
				<h2>Add tags</h2>
				<p className={styles.muted}>One per line or comma-separated, up to 100 at a time. Existing names are skipped; a matching pending tag is approved.</p>
				<div className={styles.row}>
					<select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)}>
						<option value="stack">Stack</option>
						<option value="interest">Interest</option>
					</select>
				</div>
				<textarea className={styles.textarea} rows={5} value={names} onChange={(event) => setNames(event.target.value)} placeholder={"Python\nFastAPI\nRust"} />
				<div className={styles.row}>
					<button className={styles.primary} disabled={busy || !names.trim()} onClick={addTags}>Add tags</button>
				</div>
			</section>

			<section className={styles.card}>
				<h2>Approved tags</h2>
				<form className={styles.row} action="/mod/tags" method="GET">
					<select className={styles.select} name="category" defaultValue={listCategory}>
						<option value="stack">Stack</option>
						<option value="interest">Interest</option>
					</select>
					<input className={styles.input} name="q" defaultValue={q} placeholder="Filter by name" />
					<button className={styles.button} type="submit">Filter</button>
				</form>
				{approved.length === 0 ? <p className={styles.muted}>No matches.</p> : (
					<div className={styles.chips}>
						{approved.map((tag) => (
							<span key={tag.id}>
								{tag.name} <span className={styles.muted}>({tag.uses})</span>
								{isAdmin && <button className={styles.chipX} disabled={busy} onClick={() => purge(tag)} aria-label={`Delete ${tag.name}`}>×</button>}
							</span>
						))}
					</div>
				)}
				{approved.length === 100 && <p className={styles.muted}>Showing the first 100. Narrow the filter to see others.</p>}
			</section>

			{message && <p className={styles.msg}>{message}</p>}
			{error && <p className={styles.err} role="alert">{error}</p>}
		</>
	);
}