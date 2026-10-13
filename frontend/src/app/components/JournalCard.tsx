"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { proxyFetch } from "@/lib/api-client";
import {
	GENRES,
	MAX_ACTIVE_ENTRIES,
	MAX_ENTRY_LENGTH,
	genreLabel,
	timeAgo,
	timeLeft,
} from "@/lib/journal";
import { JournalEntry } from "@/types";
import styles from "./JournalCard.module.css";

/**
 * Temporary Journal. Entries vanish 24h after posting; at most 2 can be live at once.
 * Visitors just read. The owner also gets a composer and an "End now" button per entry.
 * Time is ticked client-side so a live entry disappears the moment it expires, without a reload.
 */
export default function JournalCard({
	entries,
	isOwner,
}: {
	entries: JournalEntry[];
	isOwner: boolean;
}) {
	const router = useRouter();
	const [now, setNow] = useState(() => Date.now());
	const [text, setText] = useState("");
	const [genre, setGenre] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(timer);
	}, []);

	const live = entries.filter((entry) => timeLeft(entry.expires_at, now) !== null);
	const full = live.length >= MAX_ACTIVE_ENTRIES;

	const post = async () => {
		if (!text.trim() || full) return;
		setBusy(true);
		setError(null);
		try {
			await proxyFetch("journal", {
				method: "POST",
				body: JSON.stringify({ body: text, genre }),
			});
			setText("");
			setGenre(null);
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not post.");
		} finally {
			setBusy(false);
		}
	};

	const end = async (id: number) => {
		if (!window.confirm("End this entry now? It will disappear right away.")) return;
		setBusy(true);
		setError(null);
		try {
			await proxyFetch(`journal/${id}`, { method: "DELETE" });
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not end the entry.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={styles.wrap}>
			{live.length > 0 ? (
				<ul className={styles.list}>
					{live.map((entry) => {
						const label = genreLabel(entry.genre);
						return (
							<li key={entry.id} className={styles.entry}>
								<p className={styles.body}>{entry.body}</p>
								<div className={styles.meta}>
									{label && <span className={styles.genre}>{label}</span>}
									<span>{timeAgo(entry.created_at, now)}</span>
									<span aria-hidden="true">·</span>
									<span>{timeLeft(entry.expires_at, now)}</span>
									{isOwner && (
										<button
											type="button"
											className={styles.end}
											onClick={() => end(entry.id)}
											disabled={busy}
										>
											End now
										</button>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<p className={styles.empty}>
					{isOwner
						? "Nothing live. Share what you're up to; it disappears on its own after 24 hours."
						: "Nothing posted right now."}
				</p>
			)}

			{isOwner && (
				<div className={styles.composer}>
					<textarea
						value={text}
						maxLength={MAX_ENTRY_LENGTH}
						rows={2}
						disabled={full || busy}
						placeholder={
							full
								? "You have 2 live entries. End one to post another."
								: "What are you doing, learning, building or feeling today?"
						}
						aria-label="New journal entry"
						onChange={(event) => setText(event.target.value)}
					/>
					<div className={styles.genres} role="group" aria-label="Category (optional)">
						{GENRES.map(({ id, label }) => (
							<button
								type="button"
								key={id}
								className={genre === id ? styles.genreOn : ""}
								aria-pressed={genre === id}
								disabled={full || busy}
								onClick={() => setGenre(genre === id ? null : id)}
							>
								{label}
							</button>
						))}
					</div>
					<div className={styles.footer}>
						<span className={styles.slots}>
							{live.length}/{MAX_ACTIVE_ENTRIES} live
							{text.length > 0 && ` · ${text.length}/${MAX_ENTRY_LENGTH}`}
						</span>
						<button
							type="button"
							className={styles.post}
							onClick={post}
							disabled={busy || full || !text.trim()}
						>
							{busy ? "Posting…" : "Post"}
						</button>
					</div>
					{error && (
						<p className={styles.error} role="alert">
							{error}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
