import Image from "next/image";
import Link from "next/link";
import ProfileNav from "@/app/components/ProfileNav";
import AppShell from "@/app/components/AppShell";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import GameCard from "@/app/components/GameCard";
import BadgeEmbed from "@/app/components/BadgeEmbed";
import BioText from "@/app/components/BioText";
import ContributionGraph from "@/app/components/ContributionGraph";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import { currentStreakRange, joinedAgo } from "@/lib/streak";
import styles from "./page.module.css";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";
import ModerationBanner from "@/app/components/ModerationBanner";
import { loadProfile } from "@/lib/profile-api";
import { bannerUrl, pronounsFor, statusFor } from "@/lib/profile-mock";
import { gameArtUrl } from "@/lib/game-art";

export default async function ProfilePage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const [profile, viewer] = await Promise.all([
		loadProfile(username),
		fetchViewer(),
	]);
	const themeCookie = await getThemeCookie();

	const visibility = profile.section_visibility || {
		github: true,
		leetcode: true,
		games: true,
		interests: true,
	};
	const hasGames =
		profile.games !== null &&
		(profile.games.length > 0 || profile.is_owner);
	const hasInterests =
		profile.interests !== null &&
		(profile.interests.length > 0 || profile.is_owner);
	const hasLinks = profile.content_links.length > 0;
	const stats = profile.stats;
	const extra = stats?.extra;
	const graphCardVisible =
		profile.card_visibility?.github?.graph !== false || profile.is_owner;
	const lcMuted =
		!visibility.leetcode ||
		profile.card_visibility?.activity?.leetcode === false;
	const streakRange =
		stats?.calendar && extra
			? currentStreakRange(stats.calendar, extra.current_streak)
			: null;
	const showLc =
		(visibility.leetcode || profile.is_owner) &&
		Boolean(profile.leetcode || profile.is_owner);
	const showPersonal = hasGames || hasInterests;
	const githubLink = profile.content_links.find(
		(link) => link.label.toLowerCase() === "github",
	);
	const linkedinLink = profile.content_links.find(
		(link) => link.label.toLowerCase() === "linkedin",
	);
	const portfolioLink = profile.content_links.find(
		(link) => !["linkedin", "github"].includes(link.label.toLowerCase()),
	);
	const featuredGame = profile.games?.[0] ?? null;

	return (
		<AppShell
			viewer={
				viewer
					? { username: viewer.username, avatar_url: viewer.avatar_url }
					: null
			}
			initialTheme={themeCookie || profile.theme}
			showDisclaimer
		>
			<main className={styles.page}>
			<div className={styles.layout}>
				<ProfileNav
					username={profile.username}
					showGithub={profile.stats !== null}
					visibility={visibility}
					profile={profile}
					activeSection="profile"
				/>
				<div className={styles.container}>
					<ModerationBanner profile={profile} />
					<div className={styles.discordLayout}>
						<section className={styles.identityCard}>
							<div
								className={styles.banner}
								style={{
									// MOCK: swap bannerUrl() for profile.banner_url when the API stores custom banners.
									["--banner-image" as string]: `url(${bannerUrl(profile.username)})`,
								}}
							/>
							<div className={styles.profileBody}>
								<div className={styles.avatarWrap}>
									<Image
										src={
											profile.avatar_url ||
											"/default-avatar.png"
										}
										alt={
											profile.display_name ||
											profile.username
										}
										width={92}
										height={92}
										loading="eager"
										className={styles.avatar}
									/>
									{/* MOCK: wire to profile.presence when backend adds it. */}
									<span
										className={styles.presence}
										aria-label="Online"
									/>
								</div>
								<div className={styles.identity}>
									<h1>
										{profile.display_name ||
											profile.username}
									</h1>
									<div className={styles.handleRow}>
										<p>@{profile.username}</p>
										{/* MOCK: replace pronounsFor() with profile.pronouns. */}
										<span className={styles.pronoun}>
											{pronounsFor(profile.username)}
										</span>
									</div>
								</div>
								<p className={styles.statusBubble}>
									{/* MOCK: replace statusFor() with profile.custom_status. */}
									{statusFor(profile.username, profile.bio)}
								</p>
								{profile.bio && (
									<BioText
										text={profile.bio}
										className={styles.bio}
									/>
								)}
								<div className={styles.profileLinks}>
									{portfolioLink && (
										<a
											href={portfolioLink.url}
											target="_blank"
											rel="noreferrer"
											className={styles.actionBtn}
										>
											Message
										</a>
									)}
									{githubLink && (
										<a
											href={githubLink.url}
											target="_blank"
											rel="noreferrer"
											aria-label="Open GitHub profile"
											className={styles.external}
										>
											GitHub
										</a>
									)}
									{linkedinLink && (
										<a
											href={linkedinLink.url}
											target="_blank"
											rel="noreferrer"
											aria-label="Open LinkedIn"
											className={styles.social}
										>
											LinkedIn
										</a>
									)}
								</div>
								{featuredGame && (
									<div className={styles.nowPlaying}>
										{gameArtUrl(featuredGame.name) ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={
													gameArtUrl(
														featuredGame.name,
													) as string
												}
												alt=""
												className={
													styles.nowPlayingThumb
												}
											/>
										) : (
											<span
												className={
													styles.nowPlayingThumb
												}
											/>
										)}
										<div>
											<p>Playing</p>
											<strong>{featuredGame.name}</strong>
										</div>
									</div>
								)}
							</div>
							{profile.stack_tags.length > 0 ? (
								<div className={styles.tagRow}>
									{profile.stack_tags.map((tag) => (
										<span
											key={tag.id}
											className={styles.tag}
										>
											{tag.name}
										</span>
									))}
								</div>
							) : (
								<p
									className={styles.muted}
									style={{ margin: "0.9rem 1.15rem 0" }}
								>
									Stack: Coming Soon
								</p>
							)}
						</section>
						<div className={styles.boardColumn}>
							<nav
								className={styles.boardTabs}
								aria-label="Profile board"
							>
								<Link
									href={`/${profile.username}`}
									className={`${styles.boardTab} ${styles.boardTabActive}`}
								>
									Board
								</Link>
								<Link
									href={`/${profile.username}/activity`}
									className={styles.boardTab}
								>
									Activity
								</Link>
								<Link
									href={`/${profile.username}/games`}
									className={styles.boardTab}
								>
									Wishlist
								</Link>
							</nav>
							{(visibility.github || profile.is_owner) && (
								<section
									className={`${styles.widget} ${!visibility.github ? styles.hiddenSection : ""}`}
								>
									<div className={styles.activityHeader}>
										<div>
											<p className={styles.eyebrow}>
												GitHub activity
											</p>
											<p className={styles.statValue}>
												{stats?.available
													? stats.total_contributions
													: "-"}
											</p>
											<p className={styles.muted}>
												contributions in the last year
											</p>
										</div>
										{extra && (
											<div className={styles.streak}>
												<p className={styles.statValue}>
													{extra.current_streak}{" "}
													<span
														className={
															styles.muted
														}
													>
														Day streak
													</span>
												</p>
												{streakRange && (
													<p
														className={
															styles.muted
														}
													>
														{streakRange}
													</p>
												)}
											</div>
										)}
									</div>
									{graphCardVisible &&
										(stats?.calendar?.length ? (
											<ContributionGraph
												weeks={stats.calendar}
											/>
										) : (
											<div
												className={
													styles.graphPlaceholder
												}
											>
												No contribution data yet
											</div>
										))}
									{extra?.joined && (
										<p className={styles.muted}>
											Joined GitHub{" "}
											{joinedAgo(extra.joined)}
										</p>
									)}
								</section>
							)}
							{hasGames && (
								<section
									className={`${styles.widget} ${!visibility.games ? styles.hiddenSection : ""}`}
								>
									<div className={styles.sectionHeading}>
										<div>
											<p className={styles.sectionLabel}>
												Games I like
											</p>
											<p className={styles.widgetHint}>
												Add up to 20 games
											</p>
										</div>
										<Link
											href={`/${profile.username}/games`}
											className={styles.viewAll}
										>
											Show more
										</Link>
									</div>
									{profile.games?.length ? (
										<div className={styles.gameList}>
											{profile.games
												.slice(0, 8)
												.map((game, i) => (
													<GameCard
														key={`${game.name}-${i}`}
														game={game}
														compact
													/>
												))}
										</div>
									) : (
										<p className={styles.muted}>
											Nothing added yet.
										</p>
									)}
								</section>
							)}
							{(showLc || hasInterests) && (
								<div
									className={
										showLc && hasInterests
											? styles.splitRow
											: styles.stackRow
									}
								>
									{showLc && (
										<section
											className={`${styles.widget} ${lcMuted ? styles.hiddenSection : ""}`}
										>
											<div
												className={
													styles.sectionHeading
												}
											>
												<p
													className={
														styles.sectionLabel
													}
												>
													LeetCode
												</p>
												{profile.is_owner && (
													<ProfileEditButton
														profile={profile}
														section="leetcode"
													/>
												)}
											</div>
											{profile.leetcode ? (
												<LeetcodeCard
													lc={profile.leetcode}
												/>
											) : (
												<p className={styles.muted}>
													Add your solved counts.
												</p>
											)}
										</section>
									)}
									{hasInterests && (
										<section
											className={`${styles.widget} ${!visibility.interests ? styles.hiddenSection : ""}`}
										>
											<div
												className={
													styles.sectionHeading
												}
											>
												<p
													className={
														styles.sectionLabel
													}
												>
													Interests
												</p>
												<Link
													href={`/${profile.username}/interests`}
													className={styles.viewAll}
												>
													View all
												</Link>
											</div>
											{profile.interests?.length ? (
												<div className={styles.tagRow}>
													{profile.interests
														.slice(0, 8)
														.map((interest) => (
															<span
																key={
																	interest.id
																}
																className={
																	styles.tag
																}
															>
																{interest.name}
															</span>
														))}
												</div>
											) : (
												<p className={styles.muted}>
													Nothing added yet.
												</p>
											)}
										</section>
									)}
								</div>
							)}
							{(hasLinks || profile.is_owner) && (
								<div
									className={
										profile.is_owner
											? styles.linksRow
											: styles.linksOnly
									}
								>
									{hasLinks && (
										<section className={styles.widget}>
											<div
												className={
													styles.sectionHeading
												}
											>
												<p
													className={
														styles.sectionLabel
													}
												>
													Links
												</p>
												{profile.is_owner && (
													<ProfileEditButton
														profile={profile}
														section="links"
													/>
												)}
											</div>
											<div className={styles.linkRow}>
												{profile.content_links.map(
													(link, index) => (
														<a
															key={index}
															href={link.url}
															target="_blank"
															rel="noreferrer"
															className={
																styles.contentLink
															}
														>
															{link.label}
														</a>
													),
												)}
											</div>
										</section>
									)}
									{profile.is_owner && (
										<BadgeEmbed
											username={profile.username}
										/>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			</main>
		</AppShell>
	);
}
