import { GameEntry } from "@/types";
import { gameArt } from "./GameCard";
import styles from "./GameDetailCard.module.css";

/**
 * Generic "game details" template for the Games page. Every field is optional;
 * only the ones the owner filled in are rendered, so a bare game is still tidy.
 */
export default function GameDetailCard({ game }: { game: GameEntry }) {
	const art = gameArt(game);
	const s = game.stats;
	const rows: [string, string][] = [
		["Rank", s?.rank || game.detail || ""],
		["Hours played", typeof s?.hours === "number" ? `${s.hours.toLocaleString("en")} h` : ""],
		["Platform", s?.platform || ""],
	].filter((row): row is [string, string] => Boolean(row[1]));
	const completion = typeof s?.completion === "number" ? Math.min(100, Math.max(0, s.completion)) : null;

	const header = (
		<div className={styles.art}>
			{art && (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={art} alt="" loading="lazy" />
			)}
		</div>
	);

	return (
		<article className={styles.card}>
			{game.url ? (
				<a href={game.url} target="_blank" rel="noreferrer" aria-label={`${game.name} profile`}>
					{header}
				</a>
			) : (
				header
			)}
			<div className={styles.body}>
				<h3 className={styles.name}>{game.name}</h3>
				{rows.length > 0 && (
					<dl className={styles.rows}>
						{rows.map(([label, value]) => (
							<div key={label}>
								<dt>{label}</dt>
								<dd>{value}</dd>
							</div>
						))}
					</dl>
				)}
				{completion !== null && (
					<div className={styles.completion}>
						<div className={styles.completionHead}>
							<span>Completion</span>
							<span>{completion}%</span>
						</div>
						<div className={styles.track} role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
							<div style={{ width: `${completion}%` }} />
						</div>
					</div>
				)}
				{s?.note && <p className={styles.note}>{s.note}</p>}
				{game.url && (
					<a href={game.url} target="_blank" rel="noreferrer" className={styles.link}>
						Open profile ↗
					</a>
				)}
			</div>
		</article>
	);
}
