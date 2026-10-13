import { CurrentlyItem } from "@/types";
import styles from "./CurrentlyCard.module.css";

const KIND_LABEL: Record<string, string> = {
	tech: "tech",
	project: "project",
	game: "game",
	hobby: "hobby",
	other: "other",
};

/** "Currently into": an ongoing snapshot (unlike the 24h journal). */
export default function CurrentlyCard({ items, isOwner }: { items: CurrentlyItem[]; isOwner: boolean }) {
	if (items.length === 0) {
		return (
			<p className={styles.empty}>
				{isOwner ? "Add what you're into right now: a tool, a project, a game, a hobby." : "Nothing here yet."}
			</p>
		);
	}
	return (
		<ul className={styles.list}>
			{items.map((item, index) => (
				<li key={`${item.text}-${index}`} className={styles.item}>
					<span>{item.text}</span>
					{item.kind && <small>{KIND_LABEL[item.kind] ?? item.kind}</small>}
				</li>
			))}
		</ul>
	);
}
