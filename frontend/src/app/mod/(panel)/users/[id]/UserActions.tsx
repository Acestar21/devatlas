"use client";

import { useState } from "react";
import { proxyFetch } from "@/lib/api-client";
import { useRunner } from "@/lib/use-runner";
import styles from "../../mod.module.css";

export default function UserActions({ userId, username, suspended, openReports, isAdmin, canModerate, canDismiss }: {
	userId: number;
	username: string;
	suspended: boolean;
	openReports: number;
	isAdmin: boolean;
	canModerate: boolean;
	canDismiss: boolean;
}) {
	const { run, busy, error, message } = useRunner();
	const [days, setDays] = useState("7");
	const [reason, setReason] = useState("");
	const [dismissNote, setDismissNote] = useState("");
	const [note, setNote] = useState("");
	const durations = [1, 3, 7, 14, 30, ...(isAdmin ? [90, 365] : [])];

	const post = (path: string, body?: object) =>
		proxyFetch<{ message: string }>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

	const suspend = async () => {
		const label = days === "" ? "until lifted" : `${days} day(s)`;
		if (!window.confirm(`Suspend @${username} for ${label}? Their profile is hidden from the public immediately.`)) return;
		if (await run(() => post(`mod/users/${userId}/suspend`, { reason, days: days === "" ? null : Number(days) }))) setReason("");
	};

	return (
		<section className={styles.card}>
			<h2>Actions</h2>

			{canModerate ? (
				suspended ? (
					<div className={styles.row}>
						<button className={styles.button} disabled={busy} onClick={() => run(() => post(`mod/users/${userId}/unsuspend`))}>
							Unsuspend @{username}
						</button>
					</div>
				) : (
					<div className={styles.row}>
						<select className={styles.select} value={days} onChange={(event) => setDays(event.target.value)} aria-label="Suspension length">
							{durations.map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
							{isAdmin && <option value="">Until lifted</option>}
						</select>
						<input className={styles.input} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} placeholder="Reason (shown to the user)" />
						<button className={styles.danger} disabled={busy || !reason.trim()} onClick={suspend}>Suspend</button>
					</div>
				)
			) : (
				<p className={styles.muted}>Suspending isn&apos;t available for this account (it&apos;s you, or it outranks you).</p>
			)}

			{openReports > 0 && (canDismiss ? (
				<div className={styles.row}>
					<input className={styles.input} value={dismissNote} maxLength={300} onChange={(event) => setDismissNote(event.target.value)} placeholder="Optional note" />
					<button className={styles.button} disabled={busy} onClick={async () => { if (await run(() => post(`mod/users/${userId}/dismiss-reports`, { note: dismissNote }))) setDismissNote(""); }}>
						Dismiss {openReports} open report{openReports === 1 ? "" : "s"}
					</button>
				</div>
			) : (
				<p className={styles.muted}>Reports about staff are handled by an admin.</p>
			))}

			<div className={styles.row}>
				<input className={styles.input} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Internal note (visible to staff only)" />
				<button className={styles.button} disabled={busy || !note.trim()} onClick={async () => { if (await run(() => post(`mod/users/${userId}/notes`, { note }))) setNote(""); }}>
					Add note
				</button>
			</div>

			{message && <p className={styles.msg}>{message}</p>}
			{error && <p className={styles.err} role="alert">{error}</p>}
		</section>
	);
}