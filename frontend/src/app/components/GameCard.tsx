import { GameEntry } from "@/types";
import { gameArtUrl } from "@/lib/game-art";
import styles from "./GameCard.module.css";

export function gameArt(game: GameEntry): string | null {
	return game.cover_url || gameArtUrl(game.name);
}

/** Short chips shown on hover, e.g. "Diamond · 420h · 88%". */
export function gameChips(game: GameEntry): string[] {
	const s = game.stats;
	return [
		s?.rank || game.detail,
		typeof s?.hours === "number" ? `${s.hours}h` : null,
		typeof s?.completion === "number" ? `${s.completion}%` : null,
	].filter((v): v is string => Boolean(v));
}

/**
 * Art tile. At rest you only see the artwork; the name (and stats) fade in on
 * hover / keyboard focus. Games with no artwork keep the name visible, since
 * there would otherwise be nothing to look at.
 */
export default function GameCard({
	game,
}: {
	game: GameEntry;
	/** accepted for older call sites; tiles are always the same size now */
	compact?: boolean;
}) {
	const art = gameArt(game);
	const chips = gameChips(game);
	const className = `${styles.card} ${art ? styles.hasArt : styles.noArt}`;

	const body = (
		<>
			{art && (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={art} alt="" loading="lazy" className={styles.art} />
			)}
			<div className={styles.scrim} aria-hidden="true" />
			<div className={styles.content}>
				<strong className={styles.name}>{game.name}</strong>
				{chips.length > 0 && <span className={styles.detail}>{chips.join(" · ")}</span>}
			</div>
		</>
	);

	return game.url ? (
		<a href={game.url} target="_blank" rel="noreferrer" className={className} aria-label={game.name}>
			{body}
		</a>
	) : (
		<div className={className} tabIndex={0} role="img" aria-label={game.name}>
			{body}
		</div>
	);
}
