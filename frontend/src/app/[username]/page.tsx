import ContributionGraph from "@/app/components/ContributionGraph";
import FeaturedProject from "@/app/components/FeaturedProject";
import GameCard from "@/app/components/GameCard";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import ModerationBanner from "@/app/components/ModerationBanner";
import Panel from "@/app/components/Panel";
import PostCard from "@/app/components/PostCard";
import ProfileCard from "@/app/components/ProfileCard";
import ProfileFrame from "@/app/components/ProfileFrame";
import ReorderableGrid, { GridCard } from "@/app/components/ReorderableGrid";
import { findProfileBanner } from "@/lib/banners";
import { withBanners } from "@/lib/pinned";
import { loadProfile } from "@/lib/profile-api";
import { currentStreakRange, joinedAgo } from "@/lib/streak";
import styles from "./page.module.css";

/** Default card order; the owner's saved layout overrides it. */
const DEFAULT_ORDER = ["github", "featured", "writing", "leetcode", "games"];

export default async function ProfilePage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);

	const visibility = profile.section_visibility || {
		github: true,
		leetcode: true,
		games: true,
		interests: true,
	};
	const stats = profile.stats;
	const extra = stats?.extra;
	const cardVis = profile.card_visibility;
	const owner = profile.is_owner;

	const [banner, projects] = await Promise.all([
		findProfileBanner(profile.username),
		withBanners(stats?.pinned_repos),
	]);

	const streakRange =
		stats?.calendar && extra ? currentStreakRange(stats.calendar, extra.current_streak) : null;

	const showGithub = visibility.github || owner;
	const showFeatured = showGithub && (cardVis?.github?.pinned !== false || owner) && stats !== null;
	const posts = [...(profile.posts ?? [])].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
	const showWriting = (posts.length > 0 || owner) && (cardVis?.activity?.posts !== false || owner);
	const showLc =
		(visibility.leetcode || owner) && Boolean(profile.leetcode || owner);
	const lcMuted = !visibility.leetcode || cardVis?.activity?.leetcode === false;
	const showGames = profile.games !== null && ((profile.games?.length ?? 0) > 0 || owner) && (visibility.games || owner);

	const cards: GridCard[] = [];

	if (showGithub) {
		cards.push({
			id: "github",
			label: "GitHub activity",
			span: 2,
			node: (
				<Panel
					label="GitHub activity"
					gearSection="github"
					viewAllHref={stats ? `/${profile.username}/github` : undefined}
					muted={!visibility.github}
				>
					<div className={styles.activityHeader}>
						<div>
							<p className={styles.statValue}>
								{stats?.available ? stats.total_contributions : "—"}
							</p>
							<p className={styles.muted}>contributions in the last year</p>
						</div>
						{extra && (
							<div className={styles.streak}>
								<p className={styles.statValue}>
									{extra.current_streak} <span className={styles.muted}>Day Streak</span>
								</p>
								{streakRange && <p className={styles.muted}>{streakRange}</p>}
							</div>
						)}
					</div>
					{cardVis?.github?.graph !== false || owner ? (
						stats?.calendar?.length ? (
							<ContributionGraph weeks={stats.calendar} />
						) : (
							<div className={styles.graphPlaceholder}>No contribution data yet</div>
						)
					) : null}
					{extra?.joined && <p className={styles.muted}>Joined GitHub {joinedAgo(extra.joined)}</p>}
				</Panel>
			),
		});
	}

	if (showFeatured) {
		cards.push({
			id: "featured",
			label: "Featured project",
			span: 1,
			node: (
				<Panel
					label="Featured project"
					gearSection="github"
					gearLabel="Edit GitHub card settings"
					viewAllHref={`/${profile.username}/github`}
					muted={cardVis?.github?.pinned === false}
				>
					<FeaturedProject projects={projects} />
				</Panel>
			),
		});
	}

	if (showWriting) {
		cards.push({
			id: "writing",
			label: "Writing",
			span: 1,
			node: (
				<Panel
					label="Writing"
					gearSection="activity"
					gearLabel="Edit writing settings"
					viewAllHref={`/${profile.username}/activity`}
					muted={cardVis?.activity?.posts === false}
				>
					{posts.length > 0 ? (
						<div className={styles.postStack}>
							{posts.slice(0, 2).map((post, i) => (
								<PostCard key={`${post.url}-${i}`} post={post} />
							))}
						</div>
					) : (
						<p className={styles.muted}>No posts added yet.</p>
					)}
				</Panel>
			),
		});
	}

	if (showLc) {
		cards.push({
			id: "leetcode",
			label: "LeetCode",
			span: 1,
			node: (
				<Panel label="LeetCode" gearSection="leetcode" gearLabel="Edit LeetCode stats" muted={lcMuted}>
					{profile.leetcode ? (
						<LeetcodeCard lc={profile.leetcode} />
					) : (
						<p className={styles.muted}>Add your solved counts.</p>
					)}
				</Panel>
			),
		});
	}

	if (showGames) {
		cards.push({
			id: "games",
			label: "Games",
			span: 1,
			node: (
				<Panel
					label="Games"
					gearSection="games"
					gearLabel="Edit games"
					viewAllHref={`/${profile.username}/games`}
					muted={!visibility.games}
				>
					{profile.games?.length ? (
						<div className={styles.gameGrid}>
							{profile.games.slice(0, 4).map((game, i) => (
								<GameCard key={`${game.name}-${i}`} game={game} />
							))}
						</div>
					) : (
						<p className={styles.muted}>Nothing added yet.</p>
					)}
				</Panel>
			),
		});
	}

	const saved = profile.layout?.main ?? [];

	return (
		<ProfileFrame profile={profile} active="profile">
			<ModerationBanner profile={profile} />
			<div className={styles.home}>
				<ProfileCard profile={profile} banner={banner} />
				<div className={styles.main}>
					<ReorderableGrid
						key={saved.join(",")}
						cards={cards}
						savedOrder={saved.length ? saved : DEFAULT_ORDER}
						canEdit={owner}
					/>
				</div>
			</div>
		</ProfileFrame>
	);
}
