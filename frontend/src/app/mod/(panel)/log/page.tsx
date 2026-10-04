import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { modGet } from "@/lib/mod-api";
import { ADMIN_ONLY_ACTIONS, LOG_ACTIONS, LogPage, MfaStatus } from "@/types-mod";
import styles from "../mod.module.css";

type Params = { actor?: string; target?: string; action?: string; page?: string };
const FILTERS = ["actor", "target", "action"] as const;

export default async function LogPageView({ searchParams }: { searchParams: Promise<Params> }) {
	const params = await searchParams;
	const page = Math.max(1, Number(params.page) || 1);

	const query = (p: number) => {
		const qs = new URLSearchParams();
		FILTERS.forEach((key) => { if (params[key]) qs.set(key, params[key]!); });
		qs.set("page", String(p));
		return qs.toString();
	};

	const [data, me] = await Promise.all([modGet<LogPage>(`mod/log?${query(page)}`), modGet<MfaStatus>("mfa/status")]);
	const actions = LOG_ACTIONS.filter((a) => me.role === "admin" || !ADMIN_ONLY_ACTIONS.includes(a));

	return (
		<>
			<h1>Audit log</h1>
			<form className={styles.row} action="/mod/log" method="GET">
				<input className={styles.input} name="actor" defaultValue={params.actor} placeholder="Actor username" />
				<input className={styles.input} name="target" defaultValue={params.target} placeholder="Target username" />
				<select className={styles.select} name="action" defaultValue={params.action ?? ""}>
					<option value="">Any action</option>
					{actions.map((a) => <option key={a} value={a}>{a}</option>)}
				</select>
				<button className={styles.button} type="submit">Filter</button>
			</form>

			{data.items.length === 0 ? <p className={styles.empty}>No entries.</p> : (
				<table className={styles.table}>
					<thead><tr><th>When</th><th>By</th><th>Action</th><th>Target</th><th>Note</th></tr></thead>
					<tbody>
						{data.items.map((entry) => (
							<tr key={entry.id}>
								<td>{formatDateTime(entry.at)}</td>
								<td>@{entry.actor}</td>
								<td>{entry.action}</td>
								<td>
									{entry.target ? `@${entry.target}` : "—"}
									{entry.target_github_id !== null && <div className={styles.muted}>GitHub id {entry.target_github_id}</div>}
								</td>
								<td className={styles.wrap}>{entry.note ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			<div className={styles.pager}>
				{page > 1 ? <Link href={`/mod/log?${query(page - 1)}`}>← Newer</Link> : <span />}
				{data.has_more ? <Link href={`/mod/log?${query(page + 1)}`}>Older →</Link> : <span />}
			</div>
		</>
	);
}