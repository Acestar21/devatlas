"use client";

import { useEffect, useRef, useState } from "react";
import { gameArtUrl, getSteamGameNames } from "@/lib/game-art";
import { GameEntry, GamingHandle } from "@/types";
import styles from "./EditProfileModal.module.css";

export const HANDLE_PLATFORMS: [string, string][] = [
	["steam", "Steam"],
	["riot", "Riot ID"],
	["psn", "PSN"],
	["xbox", "Xbox"],
	["epic", "Epic"],
	["discord", "Discord"],
	["other", "Other"],
];

interface SearchHit {
	igdb_id: number | null;
	name: string;
	art: string | null;
}

/** What is typed but not yet added, so "Save settings" can include it. */
export interface GamesDraft {
	game: () => GameEntry | null;
	handle: () => GamingHandle | null;
}

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Game search: IGDB through our backend (/games/search) when it is configured,
 * otherwise the bundled Steam-name list, so the editor never breaks.
 */
async function searchGames(query: string, signal: AbortSignal): Promise<SearchHit[]> {
	try {
		const response = await fetch(`${API}/games/search?q=${encodeURIComponent(query)}`, { signal });
		if (response.ok) {
			const hits = (await response.json()) as SearchHit[];
			if (Array.isArray(hits) && hits.length > 0) return hits;
		}
	} catch (caught) {
		if ((caught as Error).name === "AbortError") throw caught;
	}
	const q = query.toLowerCase();
	return getSteamGameNames()
		.filter((name) => name.includes(q))
		.slice(0, 8)
		.map((name) => ({ igdb_id: null, name, art: gameArtUrl(name) }));
}

export default function GamesEditor({
	games,
	setGames,
	handles,
	setHandles,
	draftRef,
}: {
	games: GameEntry[];
	setGames: React.Dispatch<React.SetStateAction<GameEntry[]>>;
	handles: GamingHandle[];
	setHandles: React.Dispatch<React.SetStateAction<GamingHandle[]>>;
	draftRef: React.MutableRefObject<GamesDraft | null>;
}) {
	const [name, setName] = useState("");
	const [igdbId, setIgdbId] = useState<number | null>(null);
	const [art, setArt] = useState<string | null>(null);
	const [url, setUrl] = useState("");
	const [rank, setRank] = useState("");
	const [hours, setHours] = useState("");
	const [completion, setCompletion] = useState("");
	const [platform, setPlatform] = useState("");
	const [note, setNote] = useState("");
	const [hits, setHits] = useState<SearchHit[]>([]);
	const [open, setOpen] = useState(false);
	const [hPlatform, setHPlatform] = useState("steam");
	const [hHandle, setHHandle] = useState("");
	const debounce = useRef<number | undefined>(undefined);
	const aborter = useRef<AbortController | null>(null);

	const buildGame = (): GameEntry | null => {
		const title = name.trim();
		if (!title) return null;
		const h = Number(hours);
		const c = Number(completion);
		const stats = {
			rank: rank.trim() || null,
			hours: hours.trim() && h >= 0 ? h : null,
			completion: completion.trim() && c >= 0 && c <= 100 ? Math.round(c) : null,
			platform: platform.trim() || null,
			note: note.trim() || null,
		};
		const hasStats = Object.values(stats).some((v) => v !== null);
		return {
			name: title,
			detail: null,
			url: url.trim() || null,
			igdb_id: igdbId,
			cover_url: art && art.startsWith("https://images.igdb.com/") ? art : null,
			stats: hasStats ? stats : null,
		};
	};
	const buildHandle = (): GamingHandle | null =>
		hHandle.trim() ? { platform: hPlatform, handle: hHandle.trim() } : null;

	// keep the parent's "include what's typed on save" hook current
	useEffect(() => {
		draftRef.current = { game: buildGame, handle: buildHandle };
	});

	const reset = () => {
		setName("");
		setIgdbId(null);
		setArt(null);
		setUrl("");
		setRank("");
		setHours("");
		setCompletion("");
		setPlatform("");
		setNote("");
		setHits([]);
		setOpen(false);
	};

	const onNameChange = (value: string) => {
		setName(value);
		setIgdbId(null);
		setArt(null);
		setOpen(true);
		window.clearTimeout(debounce.current);
		aborter.current?.abort();
		if (value.trim().length < 2) {
			setHits([]);
			return;
		}
		debounce.current = window.setTimeout(async () => {
			const controller = new AbortController();
			aborter.current = controller;
			try {
				setHits(await searchGames(value.trim(), controller.signal));
			} catch {
				/* aborted by a newer keystroke */
			}
		}, 280);
	};

	const addGame = () => {
		const game = buildGame();
		if (!game) return;
		setGames((current) => [...current, game]);
		reset();
	};
	const addHandle = () => {
		const handle = buildHandle();
		if (!handle) return;
		setHandles((current) => [...current, handle]);
		setHHandle("");
	};

	return (
		<>
			<div className={styles.linkList}>
				{games.map((game, index) => (
					<div className={styles.linkEditor} key={`${game.name}-${index}`}>
						<span>
							{game.name}
							<small>
								{[
									game.stats?.rank || game.detail,
									typeof game.stats?.hours === "number" ? `${game.stats.hours}h` : null,
									typeof game.stats?.completion === "number" ? `${game.stats.completion}%` : null,
								]
									.filter(Boolean)
									.join(" · ")}
							</small>
						</span>
						<button
							type="button"
							onClick={() => setGames((current) => current.filter((_, i) => i !== index))}
							aria-label={`Remove ${game.name}`}
						>
							×
						</button>
					</div>
				))}
			</div>

			{games.length < 12 && (
				<>
					<label className={styles.field}>
						Game
						<input
							maxLength={60}
							value={name}
							placeholder="Search games..."
							autoComplete="off"
							onFocus={() => setOpen(true)}
							onChange={(event) => onNameChange(event.target.value)}
							onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
						/>
					</label>
					{open && hits.length > 0 && (
						<div className={styles.results}>
							{hits.map((hit) => (
								<button
									type="button"
									key={`${hit.igdb_id ?? "local"}-${hit.name}`}
									onClick={() => {
										setName(hit.name);
										setIgdbId(hit.igdb_id);
										setArt(hit.art);
										setOpen(false);
										setHits([]);
									}}
								>
									{hit.art && (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={hit.art} alt="" width={64} loading="lazy" />
									)}{" "}
									{hit.name}
								</button>
							))}
						</div>
					)}

					<div className={styles.grid}>
						<label className={styles.field}>
							Rank
							<input maxLength={30} placeholder="Diamond II, Level 120..." value={rank} onChange={(e) => setRank(e.target.value)} />
						</label>
						<label className={styles.field}>
							Hours played
							<input type="number" min={0} max={100000} value={hours} onChange={(e) => setHours(e.target.value)} />
						</label>
						<label className={styles.field}>
							Completion (%)
							<input type="number" min={0} max={100} value={completion} onChange={(e) => setCompletion(e.target.value)} />
						</label>
						<label className={styles.field}>
							Platform
							<input maxLength={20} placeholder="PC, PS5..." value={platform} onChange={(e) => setPlatform(e.target.value)} />
						</label>
					</div>
					<div className={styles.grid}>
						<label className={styles.field}>
							Note (optional)
							<input maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
						</label>
						<label className={styles.field}>
							Profile link (optional)
							<input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
						</label>
					</div>
					<button type="button" className={styles.addLink} onClick={addGame}>
						Add game to list
					</button>
				</>
			)}
			<p className={styles.help}>
				Any game works, no platform needed. Up to 12. All detail fields are optional. Click
				“Add game to list”, or leave it entered and click “Save settings”.
			</p>

			<div className={styles.linkList}>
				{handles.map((h, index) => (
					<div className={styles.linkEditor} key={`${h.platform}-${index}`}>
						<span>
							{HANDLE_PLATFORMS.find(([key]) => key === h.platform)?.[1] ?? h.platform}
							<small>{h.handle}</small>
						</span>
						<button
							type="button"
							onClick={() => setHandles((current) => current.filter((_, i) => i !== index))}
							aria-label={`Remove ${h.handle}`}
						>
							×
						</button>
					</div>
				))}
			</div>
			{handles.length < 8 && (
				<div className={styles.grid}>
					<label className={styles.field}>
						Platform
						<select value={hPlatform} onChange={(e) => setHPlatform(e.target.value)}>
							{HANDLE_PLATFORMS.map(([key, label]) => (
								<option key={key} value={key}>
									{label}
								</option>
							))}
						</select>
					</label>
					<label className={styles.field}>
						Username / ID
						<input maxLength={40} value={hHandle} onChange={(e) => setHHandle(e.target.value)} />
					</label>
					<button type="button" className={styles.addLink} onClick={addHandle}>
						Add handle to list
					</button>
				</div>
			)}
			<p className={styles.help}>
				Shown as plain text so people can find you. Up to 8. Click “Add handle to list” or
				leave it entered and click “Save settings”.
			</p>
		</>
	);
}
