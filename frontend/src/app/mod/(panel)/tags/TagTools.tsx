"use client";

import { useState } from "react";
import { proxyFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useRunner } from "@/lib/use-runner";
import { PendingTag } from "@/types-mod";
import styles from "../mod.module.css";

export default function TagTools({ pending }: { pending: PendingTag[] }) {
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
									<td>{formatDateTime(tag.created_at)}</td>
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

			<section className={styles.card}>
				<h2>Add tags</h2>
				<p className={styles.muted}>One per line or comma-separated, up to 100 at a time. Existing names are skipped; a matching pending tag is approved. This replaces the seed script.</p>
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

			{message && <p className={styles.msg}>{message}</p>}
			{error && <p className={styles.err} role="alert">{error}</p>}
		</>
	);
}