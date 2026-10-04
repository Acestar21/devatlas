import Link from "next/link";
import LocalTime from "@/app/components/LocalTime";
import { modGet } from "@/lib/mod-api";
import { CATEGORY_LABEL, QueueResponse } from "@/types-mod";
import { ReporterCell, RoleBadge, StatusBadge } from "./Parts";
import styles from "./mod.module.css";

export default async function QueuePage() {
	const queue = await modGet<QueueResponse>("mod/queue");

	return (
		<>
			<h1>Reports</h1>
			<p className={styles.muted}>
				{queue.groups.length} account(s) with open reports · {queue.suspended.length} currently suspended
			</p>

			{queue.groups.length === 0 && <p className={styles.empty}>No open reports.</p>}
			{queue.groups.map(({ target, reports }) => (
				<section className={styles.card} key={target.id}>
					<div className={styles.cardHead}>
						<div>
							<Link href={`/mod/users/${target.id}`}><strong>@{target.username}</strong></Link>{" "}
							<span className={styles.muted}>id {target.id}</span>
							<RoleBadge role={target.role} />
							<StatusBadge card={target} />
						</div>
						<div>
							{reports.length} open report{reports.length === 1 ? "" : "s"} · <Link href={`/mod/users/${target.id}`}>Review →</Link>
						</div>
					</div>
					<table className={styles.table}>
						<thead>
							<tr><th>When</th><th>Category</th><th>Reporter</th><th>Details</th></tr>
						</thead>
						<tbody>
							{reports.map((report) => (
								<tr key={report.id}>
									<td><LocalTime iso={report.created_at} /></td>
									<td>{CATEGORY_LABEL[report.category] ?? report.category}</td>
									<td><ReporterCell reporter={report.reporter} /></td>
									<td className={styles.wrap}>{report.details ?? <span className={styles.muted}>—</span>}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			))}

			<h2>Currently suspended</h2>
			{queue.suspended.length === 0 ? (
				<p className={styles.empty}>Nobody is suspended.</p>
			) : (
				<table className={styles.table}>
					<thead>
						<tr><th>User</th><th>Until</th><th>Reason shown to user</th></tr>
					</thead>
					<tbody>
						{queue.suspended.map((user) => (
							<tr key={user.id}>
								<td><Link href={`/mod/users/${user.id}`}>@{user.username}</Link> <span className={styles.muted}>id {user.id}</span></td>
								<td>{user.suspended_until ? <LocalTime iso={user.suspended_until} /> : "until lifted"}</td>
								<td className={styles.wrap}>{user.suspension_reason}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</>
	);
}