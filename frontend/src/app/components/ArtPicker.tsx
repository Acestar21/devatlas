"use client";

import { useEffect, useState } from "react";
import { proxyFetch } from "@/lib/api-client";
import { igdbImageUrl, parseIgdbImageId } from "@/lib/igdb";
import styles from "./ArtPicker.module.css";

interface ArtOption {
	image_id: string;
	kind: "cover" | "artwork" | "screenshot";
	url: string;
	thumb: string;
}

/**
 * Choose which IGDB image represents a game: any official cover / artwork / screenshot, or paste
 * a specific IGDB image id (or the image address copied from igdb.com).
 * Landscape artwork and screenshots fit the tiles best; a portrait cover is cropped to fit.
 */
export default function ArtPicker({
	igdbId,
	current,
	onPick,
}: {
	igdbId: number | null;
	current: string | null;
	onPick: (url: string) => void;
}) {
	// results are tagged with the game they belong to, so switching games never shows stale images
	const [result, setResult] = useState<{ id: number; options: ArtOption[] | null } | null>(null);
	const [custom, setCustom] = useState("");
	const [customError, setCustomError] = useState<string | null>(null);

	useEffect(() => {
		if (igdbId === null) return;
		let cancelled = false;
		proxyFetch<{ options: ArtOption[] }>(`games/${igdbId}/images`)
			.then((data) => !cancelled && setResult({ id: igdbId, options: data.options }))
			.catch(() => !cancelled && setResult({ id: igdbId, options: null }));
		return () => {
			cancelled = true;
		};
	}, [igdbId]);

	const settled = igdbId !== null && result?.id === igdbId;
	const options = settled ? result.options : null;
	const failed = settled && result.options === null;
	const loading = igdbId !== null && !settled;

	const applyCustom = () => {
		const id = parseIgdbImageId(custom);
		if (!id) {
			setCustomError("That doesn't look like an IGDB image id (for example co4jni).");
			return;
		}
		setCustomError(null);
		onPick(igdbImageUrl(id));
	};

	return (
		<div className={styles.picker}>
			<p className={styles.title}>Choose artwork</p>

			{loading && <p className={styles.hint}>Loading images…</p>}
			{failed && <p className={styles.hint}>Couldn&apos;t load images from IGDB. You can still paste an image id below.</p>}
			{options && options.length === 0 && <p className={styles.hint}>IGDB has no extra images for this game.</p>}

			{options && options.length > 0 && (
				<div className={styles.grid} role="listbox" aria-label="Artwork choices">
					{options.map((option) => (
						<button
							type="button"
							key={option.image_id}
							role="option"
							aria-selected={current === option.url}
							className={`${styles.option} ${current === option.url ? styles.selected : ""}`}
							onClick={() => onPick(option.url)}
							title={`${option.kind} · ${option.image_id}`}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={option.thumb} alt="" loading="lazy" />
							<span>{option.kind}</span>
						</button>
					))}
				</div>
			)}

			<div className={styles.custom}>
				<label>
					Or use a specific IGDB image
					<input
						value={custom}
						placeholder="Image id, e.g. co4jni"
						onChange={(event) => setCustom(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								applyCustom();
							}
						}}
					/>
				</label>
				<button type="button" onClick={applyCustom}>
					Use
				</button>
			</div>
			{customError && <p className={styles.error}>{customError}</p>}
			<p className={styles.hint}>
				On igdb.com, right-click an image and copy its address; the code before .jpg is the id (you can
				paste the whole address).
			</p>
		</div>
	);
}
