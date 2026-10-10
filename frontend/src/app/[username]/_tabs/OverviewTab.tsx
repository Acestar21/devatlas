import ContributionGraph from "@/app/components/ContributionGraph";
import BadgeEmbed from "@/app/components/BadgeEmbed";
import Card from "@/app/components/Card";
import GameCard from "@/app/components/GameCard";
import PostCard from "@/app/components/PostCard";
import { currentStreakRange, joinedAgo } from "@/lib/streak";
import { cardMuted, cardShown, sectionVisibility } from "@/lib/visibility";
import { Profile } from "@/types";
import styles from "./tabs.module.css";

export default function OverviewTab({ profile }: { profile: Profile }) {
	const vis = sectionVisibility(profile);
	const stats = profile.stats;
	const extra = stats?.extra;
	const base = `/${profile.username}`;

	const showGithub =
		stats !== null && (vis.github || profile.is_owner);
	const githubMuted = !vis.github;
	const showGraph = showGithub && cardShown(profile, "github", "graph");
	const featured = stats?.pinned_repos?.length
		? stats.pinned_repos.reduce((a, b) => (b.stars > a.stars ? b : a))
		: null;
	const showFeatured =
		showGithub && featured && cardShown(profile, "github", "pinned");

	const latestPost = [...(profile.posts ?? [])].sort((a, b) =>
		(b.date ?? "").localeCompare(a.date ?? ""),
	)[0];
	const showPost =
		(profile.posts !== null && Boolean(latestPost)) || profile.is_owner;

	const showGames =
		profile.games !== null && (profile.games.length > 0 || profile.is_owner);

	const streakRange =
		stats?.calendar && extra
			? currentStreakRange(stats.calendar, extra.current_streak)
			: null;

	const pairAlone = !(showFeatured && showPost);

	if (!showGraph && !showFeatured && !showPost && !showGames) {
		return (
			<Card title="Overview">
				<p className={styles.empty}>
					{profile.is_owner
						? "Nothing to show yet. Open the menu on the left and choose Edit settings to add some."
						: "Nothing here yet."}
				</p>
			</Card>
		);
	}

	return (
		<div className={styles.stack}>
			{showGraph && (
				<Card
					title="Contribution graph"
					href={`${base}/github`}
					hrefLabel="GitHub details"
					muted={githubMuted || cardMuted(profile, "github", "graph")}
					span
				>
					<div className={styles.hero}>
						<div>
							<p className={styles.big}>
								{stats?.available
									? (stats.total_contributions ?? 0)
									: "—"}
							</p>
							<p className={styles.bigLabel}>
								contributions in the last year
							</p>
						</div>
						{extra && (
							<div className={styles.right}>
								<p className={styles.big}>
									{extra.current_streak}
									<span className={styles.unit}> day streak</span>
								</p>
								{streakRange && (
									<p className={styles.sub}>{streakRange}</p>
								)}
							</div>
						)}
					</div>
					{stats?.calendar?.length ? (
						<ContributionGraph weeks={stats.calendar} />
					) : (
						<p className={styles.empty}>No contribution data yet</p>
					)}
					{extra?.joined && (
						<p className={styles.sub}>
							Joined GitHub {joinedAgo(extra.joined)}
						</p>
					)}
				</Card>
			)}

			{showFeatured && featured && (
				<Card
					title="Featured project"
					href={`${base}/github`}
					hrefLabel="All repos"
					muted={githubMuted || cardMuted(profile, "github", "pinned")}
					span={pairAlone}
				>
					<a
						href={featured.url}
						target="_blank"
						rel="noreferrer"
						className={styles.repo}
					>
						<span className={styles.repoName}>{featured.name}</span>
						<span className={styles.repoDesc}>
							{featured.description || "No description"}
						</span>
						<span className={styles.repoMeta}>
							★ {featured.stars} · open on GitHub ↗
						</span>
					</a>
				</Card>
			)}

			{showPost && (
				<Card
					title="Writing"
					href={`${base}/activity`}
					muted={cardMuted(profile, "activity", "posts")}
					span={pairAlone}
				>
					{latestPost ? (
						<PostCard post={latestPost} />
					) : (
						<p className={styles.empty}>No posts added yet.</p>
					)}
				</Card>
			)}

			{showGames && (
				<Card
					title="Games"
					href={`${base}/games`}
					muted={!vis.games}
					span
				>
					{profile.games?.length ? (
						<div className={styles.games}>
							{profile.games.slice(0, 4).map((game, i) => (
								<GameCard
									key={`${game.name}-${i}`}
									game={game}
									compact
								/>
							))}
						</div>
					) : (
						<p className={styles.empty}>Nothing added yet.</p>
					)}
				</Card>
			)}

			{profile.is_owner && <BadgeEmbed username={profile.username} />}
		</div>
	);
}
