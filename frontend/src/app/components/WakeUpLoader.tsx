"use client";

import { useEffect, useState } from "react";
import CatchGame from "./CatchGame";
import styles from "./WakeUpLoader.module.css";

const SHOW_AFTER_MS = 350; // fast loads never see the loader
const WAKING_AFTER_MS = 4000; // slower than this usually means the free host is waking up

export default function WakeUpLoader() {
	const [visible, setVisible] = useState(false);
	const [waking, setWaking] = useState(false);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		const showTimer = window.setTimeout(
			() => setVisible(true),
			SHOW_AFTER_MS,
		);
		const wakingTimer = window.setTimeout(
			() => setWaking(true),
			WAKING_AFTER_MS,
		);
		return () => {
			window.clearTimeout(showTimer);
			window.clearTimeout(wakingTimer);
		};
	}, []);

	if (!visible) return null;

	return (
		<div className={styles.loading} role="status" aria-live="polite">
			<div className={styles.mark} aria-hidden="true">
				<span className={styles.ring} />
				<span className={styles.ring} />
				<span className={styles.core}>D</span>
			</div>
			<p className={styles.title}>
				{waking ? "Waking up the server" : "Loading"}
				<span className={styles.dots}>...</span>
			</p>
			{waking && (
				<>
					<p className={styles.disclaimer}>
						DevAtlas runs on free hosting that sleeps when idle. The
						first visit can take up to a minute, and this page will
						load by itself.
					</p>
					{playing ? (
						<CatchGame />
					) : (
						<button
							className={styles.play}
							onClick={() => setPlaying(true)}
						>
							Play while you wait
						</button>
					)}
				</>
			)}
		</div>
	);
}
