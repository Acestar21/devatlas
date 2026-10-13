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
 * Choose which IGDB image represents a game. Portrait covers and landscape artwork are
 * deliberately separated so the owner can keep a consistent presentation.
 */
export default function ArtPicker({
	igdbId,
	onPick,
}: {
	igdbId: number | null;
	onPick: (url: string) => void;
}) {
	// results are tagged with the game they belong to, so switching games never shows stale images
	const [result, setResult] = useState<{ id: number; options: ArtOption[] | null } | null>(null);
	const [custom, setCustom] = useState("");
	const [customError, setCustomError] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | "portrait" | "landscape">("all");
	const [preview, setPreview] = useState<ArtOption | null>(null);
	const [picked, setPicked] = useState(false);

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
	const visibleOptions =
		options?.filter((option) =>
			filter === "all" ||
			(filter === "portrait" ? option.kind === "cover" : option.kind !== "cover"),
		) ?? [];

	const applyCustom = () => {
		const id = parseIgdbImageId(custom);
		if (!id) {
			setCustomError("That doesn't look like an IGDB image id (for example co4jni).");
			return;
		}
		setCustomError(null);
		onPick(igdbImageUrl(id));
		setPicked(true);
	};

	return (
		<div className={styles.picker}>
			<div className={styles.heading}>
				<div>
					<p className={styles.title}>Artwork for this game</p>
					<p className={styles.helper}>Open the gallery to browse a large preview, then select the image you want to save.</p>
				</div>
			</div>
			{picked && <p className={styles.confirmed}>Artwork selected. Save settings to keep this choice.</p>}

			{loading && <p className={styles.hint}>Loading images...</p>}
			{failed && <p className={styles.hint}>Couldn&apos;t load images from IGDB. You can still paste an image id below.</p>}
			{options && options.length === 0 && <p className={styles.hint}>IGDB has no extra images for this game.</p>}

			{options && options.length > 0 && (
				<button type="button" className={styles.openGallery} onClick={() => setPreview(visibleOptions[0] ?? null)}>
					<span>Browse artwork</span>
					<small>{visibleOptions.length} {filter === "all" ? "images" : `${filter} images`} available</small>
				</button>
			)}

			{preview && (
				<div className={styles.previewBackdrop} role="presentation" onMouseDown={() => setPreview(null)}>
					<div
						className={styles.previewDialog}
						role="dialog"
						aria-modal="true"
						aria-labelledby="art-preview-title"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className={styles.previewHeader}>
							<div>
								<p className={styles.title} id="art-preview-title">Preview artwork</p>
								<p className={styles.hint}>This is how the saved image will be used.</p>
							</div>
							<button type="button" className={styles.close} onClick={() => setPreview(null)} aria-label="Close artwork preview">
								×
							</button>
						</div>
						<div className={styles.previewToolbar}>
							<label className={styles.filter}>
								<span>Show</span>
								<select value={filter} onChange={(event) => {
									const nextFilter = event.target.value as typeof filter;
									setFilter(nextFilter);
									const nextOptions = options?.filter((option) =>
										nextFilter === "all" || (nextFilter === "portrait" ? option.kind === "cover" : option.kind !== "cover"),
									) ?? [];
									if (nextOptions.length > 0) setPreview(nextOptions[0]);
								}}>
									<option value="all">All images</option>
									<option value="portrait">Portrait covers</option>
									<option value="landscape">Landscape scenes</option>
								</select>
							</label>
							<span className={styles.previewCount}>{visibleOptions.findIndex((option) => option.image_id === preview.image_id) + 1} / {visibleOptions.length}</span>
						</div>
						<div className={styles.previewImage}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={preview.url} alt={`${preview.kind} preview`} />
						</div>
						<div className={styles.previewRail} aria-label="Artwork previews">
							{visibleOptions.map((option) => (
								<button
									type="button"
									key={option.image_id}
									className={option.image_id === preview.image_id ? styles.railSelected : ""}
									onClick={() => setPreview(option)}
									aria-label={`Preview ${option.kind}`}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={option.thumb} alt="" />
								</button>
							))}
						</div>
						<div className={styles.previewActions}>
							<button type="button" className={styles.cancel} onClick={() => setPreview(null)}>Choose another</button>
							<button
								type="button"
								className={styles.confirm}
								onClick={() => {
									onPick(preview.url);
									setPicked(true);
									setPreview(null);
								}}
							>
								Use this artwork
							</button>
						</div>
					</div>
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
			<p className={styles.hint}>You can also paste an IGDB image address below if the image you want is not listed.</p>
		</div>
	);
}
