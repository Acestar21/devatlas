import Card from "@/app/components/Card";
import ContributionGraph from "@/app/components/ContributionGraph";
import FeaturedProject from "@/app/components/FeaturedProject";
import GameCard from "@/app/components/GameCard";
import PostCard from "@/app/components/PostCard";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import ReorderableGrid, { GridCard } from "@/app/components/ReorderableGrid";
import { withBanners } from "@/lib/pinned";
import { currentStreakRange, joinedAgo } from "@/lib/streak";
import { cardMuted, cardShown, sectionVisibility } from "@/lib/visibility";
import { Profile } from "@/types";
import styles from "./tabs.module.css";

/** Default order; the owner's saved layout (profile.layout.main) overrides it. */
const DEFAULT_ORDER = ["github", "featured", "writing", "games"];

export default async function OverviewTab({ profile }: { profile: Profile }) {
	const vis = sectionVisibility(profile);
	const stats = profile.stats;
	const extra = stats?.extra;
	const base = `/${profile.username}`;

	const showGithub = stats !== null && (vis.github || profile.is_owner);
	const githubMuted = !vis.github;
	const showGraph = showGithub && cardShown(profile, "github", "graph");
	const projects = await withBanners(stats?.pinned_repos);
	const showFeatured =
		showGithub && projects.length > 0 && cardShown(profile, "github", "pinned");

	const posts = [...(profile.posts ?? [])].sort((a, b) =>
		(b.date ?? "").localeCompare(a.date ?? ""),
	);
	const showPost = profile.posts !== null && (posts.length > 0 || profile.is_owner);
	const showGames =
		profile.games !== null &&
		(profile.games.length > 0 || profile.is_owner) &&
		(vis.games || profile.is_owner);

	const streakRange =
		stats?.calendar && extra ? currentStreakRange(stats.calendar, extra.current_streak) : null;

	// featured + writing sit side by side; if only one exists it takes the full row
	const pairAlone = !(showFeatured && showPost);

	const cards: GridCard[] = [];

	if (showGraph) {
		cards.push({
			id: "github",
			label: "Contribution graph",
			span: 2,
			node: (
				<Card
					title="Contribution graph"
					href={`${base}/github`}
					hrefLabel="GitHub details"
					action={<ProfileEditButton section="github" />}
					muted={githubMuted || cardMuted(profile, "github", "graph")}
				>
					<div className={styles.hero}>
						<div>
							<p className={styles.big}>
								{stats?.available ? (stats.total_contributions ?? 0) : "—"}
							</p>
							<p className={styles.bigLabel}>contributions in the last year</p>
						</div>
						{extra && (
							<div className={styles.right}>
								<p className={styles.big}>
									{extra.current_streak}
									<span className={styles.unit}> day streak</span>
								</p>
								{streakRange && <p className={styles.sub}>{streakRange}</p>}
							</div>
						)}
					</div>
					{stats?.calendar?.length ? (
						<ContributionGraph weeks={stats.calendar} />
					) : (
						<p className={styles.empty}>No contribution data yet</p>
					)}
					{extra?.joined && (
						<p className={styles.sub}>Joined GitHub {joinedAgo(extra.joined)}</p>
					)}
				</Card>
			),
		});
	}

	if (showFeatured) {
		cards.push({
			id: "featured",
			label: "Featured project",
			span: pairAlone ? 2 : 1,
			node: (
				<Card
					title="Featured project"
					href={`${base}/github`}
					hrefLabel="All repos"
					action={<ProfileEditButton section="github" />}
					muted={githubMuted || cardMuted(profile, "github", "pinned")}
				>
					<FeaturedProject projects={projects} />
				</Card>
			),
		});
	}

	if (showPost) {
		cards.push({
			id: "writing",
			label: "Writing",
			span: pairAlone ? 2 : 1,
			node: (
				<Card
					title="Writing"
					href={`${base}/activity`}
					action={<ProfileEditButton section="activity" />}
					muted={cardMuted(profile, "activity", "posts")}
				>
					{posts.length ? (
						<div className={styles.postStack}>
							{posts.slice(0, 2).map((post, i) => (
								<PostCard key={`${post.url}-${i}`} post={post} />
							))}
						</div>
					) : (
						<p className={styles.empty}>No posts added yet.</p>
					)}
				</Card>
			),
		});
	}

	if (showGames) {
		cards.push({
			id: "games",
			label: "Games",
			span: 2,
			node: (
				<Card
					title="Games"
					href={`${base}/games`}
					action={<ProfileEditButton section="games" />}
					muted={!vis.games}
				>
					{profile.games?.length ? (
						<div className={styles.gameGrid}>
							{profile.games.slice(0, 4).map((game, i) => (
								<GameCard key={`${game.name}-${i}`} game={game} />
							))}
						</div>
					) : (
						<p className={styles.empty}>Nothing added yet.</p>
					)}
				</Card>
			),
		});
	}

	if (cards.length === 0) {
		return (
			<Card title="Overview">
				<p className={styles.empty}>
					{profile.is_owner
						? "Nothing to show yet. Use the gear icons to add some."
						: "Nothing here yet."}
				</p>
			</Card>
		);
	}

	const saved = profile.layout?.main ?? [];
	return (
		<ReorderableGrid
			key={saved.join(",")}
			cards={cards}
			savedOrder={saved.length ? saved : DEFAULT_ORDER}
			canEdit={profile.is_owner}
		/>
	);
}
