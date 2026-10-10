import Link from "next/link";
import { GameEntry } from "@/types";
import GameCard from "./GameCard";
import styles from "./GamesPreview.module.css";

export default function GamesPreview({
	username,
	games,
}: {
	username: string;
	games: GameEntry[];
}) {
	const previewGames = games.slice(0, 4);

	return (
		<>
			<div className={styles.grid}>
				{previewGames.map((game, index) => (
					<GameCard
						key={`${game.name}-${index}`}
						game={game}
						compact
					/>
				))}
			</div>
			{games.length > 4 && (
				<div className={styles.actions}>
					<Link
						href={`/${username}/games`}
						className={styles.action}
					>
						View more
					</Link>
				</div>
			)}
		</>
	);
}
