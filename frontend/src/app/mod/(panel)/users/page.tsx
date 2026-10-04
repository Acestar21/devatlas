import Link from "next/link";
import { modGet } from "@/lib/mod-api";
import { ModCard } from "@/types-mod";
import { RoleBadge, StatusBadge } from "../Parts";
import styles from "../mod.module.css";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
	const { query = "" } = await searchParams;
	const q = query.trim();
	const results = q ? await modGet<ModCard[]>(`mod/users?query=${encodeURIComponent(q)}`) : null;

	return (
		<>
			<h1>Users</h1>
			<form className={styles.row} action="/mod/users" method="GET">
				<input className={styles.input} name="query" defaultValue={query} placeholder="GitHub username, display name or account id" autoFocus />
				<button className={styles.primary} type="submit">Search</button>
			</form>

			{results && (results.length === 0 ? (
				<p className={styles.empty}>No matches.</p>
			) : (
				<table className={styles.table}>
					<thead>
						<tr><th>Account</th><th>Display name</th><th>Status</th></tr>
					</thead>
					<tbody>
						{results.map((user) => (
							<tr key={user.id}>
								<td><Link href={`/mod/users/${user.id}`}>@{user.username}</Link> <span className={styles.muted}>id {user.id}</span><RoleBadge role={user.role} /></td>
								<td>{user.display_name ?? <span className={styles.muted}>—</span>}</td>
								<td><StatusBadge card={user} /></td>
							</tr>
						))}
					</tbody>
				</table>
			))}
		</>
	);
}