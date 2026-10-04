"use client";

import Link from "next/link";
import { useState } from "react";
import { proxyFetch } from "@/lib/api-client";
import LocalTime from "@/app/components/LocalTime";
import { useRunner } from "@/lib/use-runner";
import { TeamMember } from "@/types-mod";
import { StatusBadge } from "../Parts";
import styles from "../mod.module.css";

export default function TeamTools({ moderators }: { moderators: TeamMember[] }) {
	const { run, busy, error, message } = useRunner();
	const [username, setUsername] = useState("");

	const act = (confirmText: string, path: string, method: "POST" | "DELETE") => {
		if (window.confirm(confirmText)) run(() => proxyFetch<{ message: string }>(path, { method }));
	};

	const grant = async () => {
		const ok = await run(() => proxyFetch<{ message: string }>("mod/team", { method: "POST", body: JSON.stringify({ username }) }));
		if (ok) setUsername("");
	};

	return (
		<>
			<section className={styles.card}>
				<h2>Moderators ({moderators.length})</h2>
				{moderators.length === 0 ? <p className={styles.muted}>No moderators yet.</p> : (
					<table className={styles.table}>
						<thead><tr><th>Account</th><th>Status</th><th>MFA set up</th><th /></tr></thead>
						<tbody>
							{moderators.map((m) => (
								<tr key={m.id}>
									<td><Link href={`/mod/users/${m.id}`}>@{m.username}</Link> <span className={styles.muted}>id {m.id}</span></td>
									<td><StatusBadge card={m} /></td>
									<td>{m.mfa_enrolled_at ? <LocalTime iso={m.mfa_enrolled_at} /> : <span className={styles.muted}>not yet</span>}</td>
									<td>
										<div className={styles.row}>
											<button className={styles.button} disabled={busy} onClick={() => act(`End @${m.username}'s current session now?`, `mod/team/${m.id}/end-elevation`, "POST")}>End session</button>
											<button className={styles.button} disabled={busy || !m.mfa_enrolled_at} onClick={() => act(`Reset MFA for @${m.username}? They must set it up again.`, `mod/team/${m.id}/mfa`, "DELETE")}>Reset MFA</button>
											<button className={styles.danger} disabled={busy} onClick={() => act(`Remove @${m.username} as moderator?`, `mod/team/${m.id}`, "DELETE")}>Remove role</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			<section className={styles.card}>
				<h2>Add a moderator</h2>
				<p className={styles.muted}>They must have signed in to DevAtlas once. Then they open /mod/mfa to set up their authenticator. You&apos;ll get a Discord alert when they do; check the &quot;MFA set up&quot; date above against it. Suspended accounts can&apos;t be made moderators.</p>
				<div className={styles.row}>
					<input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="GitHub username" />
					<button className={styles.primary} disabled={busy || !username.trim()} onClick={grant}>Grant moderator</button>
				</div>
			</section>

			<section className={styles.card}>
				<h2>Your own MFA</h2>
				<p className={styles.muted}>If you lose your device and recovery codes, run <code>python -m app.scripts.reset_mfa YOUR-USERNAME</code> on a machine that can reach the database.</p>
			</section>

			{message && <p className={styles.msg}>{message}</p>}
			{error && <p className={styles.err} role="alert">{error}</p>}
		</>
	);
}