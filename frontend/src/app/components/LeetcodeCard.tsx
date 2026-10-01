import { LeetcodeStats } from "@/types";
import styles from "./LeetcodeCard.module.css";

const ROWS = [
	["Easy", "easy", "#00b8a3"],
	["Medium", "medium", "#ffc01e"],
	["Hard", "hard", "#ef4743"],
] as const;

export default function LeetcodeCard({ lc }: { lc: LeetcodeStats }) {
	return (
		<div className={styles.wrap}>
			<div className={styles.total}>
				<strong>{lc.total}</strong>
				<span>solved · self-reported</span>
			</div>
			<div className={styles.rows}>
				{ROWS.map(([label, key, color]) => (
					<div className={styles.row} key={key}>
						<span>{label}</span>
						<div className={styles.track}>
							<div
								style={{
									width: `${lc.total ? (lc[key] / lc.total) * 100 : 0}%`,
									background: color,
								}}
							/>
						</div>
						<span className={styles.count}>{lc[key]}</span>
					</div>
				))}
			</div>
			<a
				href={lc.url}
				target="_blank"
				rel="noreferrer"
				className={styles.link}
			>
				View on LeetCode ↗
			</a>
		</div>
	);
}
