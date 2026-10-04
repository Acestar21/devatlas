import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { modGet } from "@/lib/mod-api";
import { CATEGORY_LABEL, MfaStatus, UserDetail } from "@/types-mod";
import { Chips, ReporterCell, RoleBadge, StatusBadge } from "../../Parts";
import UserActions from "./UserActions";
import styles from "../../mod.module.css";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!/^\d+$/.test(id)) notFound();

	const [detail, me] = await Promise.all([modGet<UserDetail>(`mod/users/${id}`), modGet<MfaStatus>("mfa/status")]);
	const { account, content, reports_against, reports_filed, history } = detail;

	const isAdmin = me.role === "admin";
	const isSelf = account.username === me.username;
	// mirrors the backend rule (_check_can_act_on); the backend is still the authority
	const canModerate = !isSelf && account.role !== "admin" && (account.role !== "moderator" || isAdmin);
	const openReports = reports_against.filter((r) => r.status === "open").length;

	return (
		<>
			<p><Link href="/mod">← Reports</Link> · <Link href="/mod/users">Users</Link></p>
			<h1>@{account.username} <StatusBadge card={account} /><RoleBadge role={account.role} /></h1>

			<section className={styles.card}>
				<h2>Account</h2>
				<dl className={styles.kv}>
					<dt>Account id</dt><dd>{account.id}</dd>
					<dt>GitHub id</dt><dd>{account.github_id}</dd>
					<dt>Display name</dt><dd>{account.display_name ?? "—"}</dd>
					<dt>Created</dt><dd>{formatDateTime(account.created_at)}</dd>
					<dt>Public profile</dt><dd><Link href={`/${account.username}`}>/{account.username}</Link> (staff can view it even when suspended)</dd>
					{account.suspended && (<><dt>Suspension</dt><dd>{account.suspended_until ? `until ${formatDateTime(account.suspended_until)}` : "until lifted"}. Reason shown to user: {account.suspension_reason}</dd></>)}
					<dt>Reports filed by them</dt><dd>{reports_filed.total} total, {reports_filed.dismissed} dismissed</dd>
				</dl>
			</section>

			<UserActions userId={account.id} username={account.username} suspended={account.suspended} openReports={openReports} isAdmin={isAdmin} canModerate={canModerate} />

			<section className={styles.card}>
				<h2>Reports against this account</h2>
				{reports_against.length === 0 ? <p className={styles.muted}>None.</p> : (
					<table className={styles.table}>
						<thead><tr><th>When</th><th>Status</th><th>Category</th><th>Reporter</th><th>Details</th></tr></thead>
						<tbody>
							{reports_against.map((report) => (
								<tr key={report.id}>
									<td>{formatDateTime(report.created_at)}</td>
									<td>{report.status}</td>
									<td>{CATEGORY_LABEL[report.category] ?? report.category}</td>
									<td><ReporterCell reporter={report.reporter} /></td>
									<td className={styles.wrap}>{report.details ?? <span className={styles.muted}>—</span>}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			<section className={styles.card}>
				<h2>Profile content</h2>
				<p className={styles.muted}>URLs are plain text on purpose. Open the public profile above to see it as users do.</p>
				<dl className={styles.kv}>
					<dt>Bio</dt><dd className={styles.wrap}>{content.bio ?? "—"}</dd>
					<dt>Stack</dt><dd><Chips items={content.stack} /></dd>
					<dt>Interests</dt><dd><Chips items={content.interests} /></dd>
					<dt>Games</dt><dd className={styles.wrap}>{content.games.length ? content.games.map((g) => `${g.name}${g.detail ? ` (${g.detail})` : ""}${g.url ? ` ${g.url}` : ""}`).join("\n") : "—"}</dd>
					<dt>Gaming handles</dt><dd><Chips items={content.gaming_handles.map((h) => `${h.platform}: ${h.handle}`)} /></dd>
					<dt>Links</dt><dd className={styles.wrap}>{content.links.length ? content.links.map((l) => `${l.label}: ${l.url}`).join("\n") : "—"}</dd>
					<dt>Posts</dt><dd className={styles.wrap}>{content.posts.length ? content.posts.map((p) => `${p.title}: ${p.url}`).join("\n") : "—"}</dd>
					<dt>LeetCode</dt><dd>{content.leetcode_username ?? "—"}</dd>
				</dl>
			</section>

			<section className={styles.card}>
				<h2>History and notes</h2>
				{history.length === 0 ? <p className={styles.muted}>No moderation history.</p> : (
					<table className={styles.table}>
						<thead><tr><th>When</th><th>By</th><th>Action</th><th>Note</th></tr></thead>
						<tbody>
							{history.map((entry) => (
								<tr key={entry.id}>
									<td>{formatDateTime(entry.at)}</td>
									<td>@{entry.actor}</td>
									<td>{entry.action}</td>
									<td className={styles.wrap}>{entry.note ?? "—"}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>
		</>
	);
}