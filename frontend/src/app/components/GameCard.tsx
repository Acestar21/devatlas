import { GameEntry } from "@/types";
import styles from "./GameCard.module.css";

export default function GameCard({
	game,
	compact = false,
}: {
	game: GameEntry;
	compact?: boolean;
}) {
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

	// FUTURE (images): add an absolutely-positioned <img> as the first child here.
	// .card is already position: relative; overflow: hidden.
	return game.url ? (
		<a
			href={game.url}
			target="_blank"
			rel="noreferrer"
			className={className}
		>
			{content}
		</a>
	) : (
		<div className={className}>{content}</div>
	);
}
