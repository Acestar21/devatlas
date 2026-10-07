import { GameEntry } from "@/types";
import styles from "./GameCard.module.css";
import { gameArtUrl } from "@/lib/game-art";

export default function GameCard({
	game,
	compact = false,
}: {
	game: GameEntry;
	compact?: boolean;
}) {
	const art = gameArtUrl(game.name);
	const content = (
		<>
			<strong className={styles.name}>{game.name}</strong>
			{game.detail && (
				<span className={styles.detail}>{game.detail}</span>
			)}
			{game.url && !compact && (
				<span className={styles.link}>Open profile ↗</span>
			)}
		</>
	);
	const className = `${styles.card} ${compact ? styles.compact : ""}`;

	const body = (
		<>
			{art && (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={art} alt="" loading="lazy" className={styles.art} />
			)}
			<div className={styles.scrim} aria-hidden="true" />
			<div className={styles.content}>{content}</div>
		</>
	);
	// .card is already position: relative; overflow: hidden.
	return game.url ? (
		<a
			href={game.url}
			target="_blank"
			rel="noreferrer"
			className={className}
		>
			{body}
		</a>
	) : (
		<div className={className}>{body}</div>
	);
}
