"use client";

import { useState } from "react";
import styles from "./DeleteAccount.module.css";

export default function DeleteAccount({ username }: { username: string }) {
	const [open, setOpen] = useState(false);
	const [confirm, setConfirm] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const remove = async () => {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch("/api/account/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ confirm }),
			});
			const data = (await res.json().catch(() => null)) as {
				detail?: unknown;
				github_revoked?: boolean;
			} | null;
			if (!res.ok)
				throw new Error(
					typeof data?.detail === "string"
						? data.detail
						: "Could not delete account.",
				);
			window.location.assign(
				data?.github_revoked === false
					? "/directory?deleted=manual"
					: "/directory?deleted=1",
			);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Could not delete account.",
			);
			setBusy(false);
		}
	};

	return (
		<div className={styles.zone}>
			<p className={styles.title}>Danger zone</p>
			{!open ? (
				<>
					<p className={styles.text}>
						Permanently delete your DevAtlas profile and revoke
						DevAtlas&apos; access to your GitHub account. Your
						GitHub account itself is not affected.
					</p>
					<button
						className={styles.open}
						onClick={() => setOpen(true)}
					>
						Delete account…
					</button>
				</>
			) : (
				<>
					<p className={styles.text}>
						This removes your profile, tags, games, LeetCode stats
						and posts. It can&apos;t be undone. Type{" "}
						<strong>{username}</strong> to confirm.
					</p>
					<input
						className={styles.input}
						value={confirm}
						placeholder={username}
						onChange={(event) => setConfirm(event.target.value)}
					/>
					{error && (
						<p className={styles.error} role="alert">
							{error}
						</p>
					)}
					<div className={styles.row}>
						<button
							onClick={() => {
								setOpen(false);
								setConfirm("");
								setError(null);
							}}
						>
							Cancel
						</button>
						<button
							className={styles.confirm}
							disabled={busy || confirm !== username}
							onClick={remove}
						>
							{busy ? "Deleting..." : "Delete permanently"}
						</button>
					</div>
				</>
			)}
		</div>
	);
}
