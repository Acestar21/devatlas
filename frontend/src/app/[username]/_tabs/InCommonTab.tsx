import Link from "next/link";
import Card from "@/app/components/Card";
import GameCard from "@/app/components/GameCard";
import TagList from "@/app/components/TagList";
import { computeInCommon } from "@/lib/in-common";
import { Profile } from "@/types";
import styles from "./tabs.module.css";

export default function InCommonTab({
	profile,
	viewer,
}: {
	profile: Profile;
	viewer: Profile | null;
}) {
	if (!viewer) {
		return (
			<Card title="In common">
				<div className={styles.summary}>
					<p className={styles.empty}>
						Log in to see what you and @{profile.username} have in
						common: stack, interests, games and languages.
					</p>
					<Link href="/directory?login=1" className={styles.cta}>
						Log in
					</Link>
				</div>
			</Card>
		);
	}

	const common = computeInCommon(profile, viewer);
	if (common.total === 0) {
		return (
			<Card title="In common">
				<p className={styles.empty}>
					Nothing shared yet. Add more to your own stack, interests and
					games and overlaps will show up here.
				</p>
			</Card>
		);
	}

	return (
		<div className={styles.single}>
			<Card title="In common">
				<div className={styles.summary}>
					<strong>
						{common.total} thing{common.total === 1 ? "" : "s"} shared
					</strong>
					<p className={styles.empty}>
						Between you and @{profile.username}.
					</p>
				</div>
			</Card>
			{common.stack.length > 0 && (
				<Card title="Stack">
					<TagList tags={common.stack.map((t) => t.name)} limit={24} />
				</Card>
			)}
			{common.languages.length > 0 && (
				<Card title="Languages">
					<TagList tags={common.languages} limit={24} />
				</Card>
			)}
			{common.interests.length > 0 && (
				<Card title="Interests">
					<TagList tags={common.interests.map((t) => t.name)} limit={24} />
				</Card>
			)}
			{common.games.length > 0 && (
				<Card title="Games">
					<div className={styles.games}>
						{common.games.map((game, i) => (
							<GameCard key={`${game.name}-${i}`} game={game} compact />
						))}
					</div>
				</Card>
			)}
		</div>
	);
}
