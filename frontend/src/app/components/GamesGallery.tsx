"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameEntry } from "@/types";
import { proxyFetch } from "@/lib/api-client";
import GameDetailCard from "./GameDetailCard";
import styles from "./GamesGallery.module.css";

type Orientation = "wide" | "tall";
type Filter = "all" | "portrait" | "landscape";

function imageOrientation(game: GameEntry): "portrait" | "landscape" {
	return game.cover_url?.includes("t_cover") ? "portrait" : "landscape";
}

export default function GamesGallery({
	games,
	canEdit = false,
	initialOrientation = "wide",
}: {
	games: GameEntry[];
	canEdit?: boolean;
	initialOrientation?: Orientation;
}) {
	const [orientation, setOrientation] = useState<Orientation>(initialOrientation);
	const [filter, setFilter] = useState<Filter>("all");
	const trackRef = useRef<HTMLDivElement>(null);
	const [paused, setPaused] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const changeOrientation = async (value: Orientation) => {
		setSaveError(null);
		setOrientation(value);
		if (!canEdit) return;
		try {
			await proxyFetch("profiles/me", {
				method: "PATCH",
				body: JSON.stringify({ layout: { games_orientation: value } }),
			});
		} catch (caught) {
			setOrientation(initialOrientation);
			setSaveError(caught instanceof Error ? caught.message : "Could not save the artwork layout.");
		}
	};

	const visibleGames = useMemo(
		() => games.filter((game) => filter === "all" || imageOrientation(game) === filter),
		[filter, games],
	);

	useEffect(() => {
		const track = trackRef.current;
		if (!track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const timer = window.setInterval(() => {
			if (paused || track.scrollWidth <= track.clientWidth) return;
			const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
			track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + 1, behavior: "auto" });
		}, 40);
		return () => window.clearInterval(timer);
	}, [paused, visibleGames.length]);

	return (
	<div className={`${styles.gallery}${orientation === "tall" ? ` ${styles.tall}` : ""}`}>
		{canEdit && (
			<div className={styles.toolbar}>
				<div>
					<strong>Artwork layout</strong>
					<span>Choose how your saved art is framed.</span>
				</div>
				<div className={styles.controls}>
					<div className={styles.segmented} role="group" aria-label="Game card orientation">
						<button type="button" className={orientation === "wide" ? styles.active : ""} onClick={() => changeOrientation("wide")}>
							Wide
							</button>
							<button type="button" className={orientation === "tall" ? styles.active : ""} onClick={() => changeOrientation("tall")}>
								Tall
							</button>
						</div>
						<label className={styles.filter}>
							<span>Artwork</span>
							<select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
								<option value="all">All</option>
								<option value="landscape">Landscape</option>
								<option value="portrait">Portrait</option>
							</select>
						</label>
					</div>
				</div>
			)}
			{saveError && <p className={styles.empty} role="alert">{saveError}</p>}
			{visibleGames.length > 0 ? (
				<div
					className={styles.track}
					ref={trackRef}
					onMouseEnter={() => setPaused(true)}
					onMouseLeave={() => setPaused(false)}
					onFocus={() => setPaused(true)}
					onBlur={() => setPaused(false)}
				>
					{visibleGames.map((game, index) => (
						<GameDetailCard key={`${game.name}-${index}`} game={game} orientation={orientation} />
					))}
				</div>
			) : (
				<p className={styles.empty}>No games match this artwork filter.</p>
			)}
		</div>
	);
}
