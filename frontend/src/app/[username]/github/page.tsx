import { notFound } from "next/navigation";
import Image from "next/image";
import ProfileNav from "@/app/components/ProfileNav";
import AppShell from "@/app/components/AppShell";
import ContributionGraph from "@/app/components/ContributionGraph";
import styles from "./page.module.css";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";
import { loadProfile } from "@/lib/profile-api";

export default async function GithubPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);
	const viewer = await fetchViewer();
	const themeCookie = await getThemeCookie();

	if (
		profile.stats === null ||
		(profile.section_visibility?.github === false && !profile.is_owner)
	)
		notFound();

	const stats = profile.stats;
	const e = stats.extra;

	const cv = profile.card_visibility?.github ?? {};
	const show = (card: string) => (cv[card] ?? true) || profile.is_owner;
	const dim = (card: string) =>
		(cv[card] ?? true) ? "" : ` ${styles.hiddenSection}`;

	const metrics: [string, string | number][] = e
		? [
				["Contributions (1y)", stats.total_contributions ?? 0],
				["Commits (1y)", e.commits],
				["Pull requests (1y)", e.pull_requests],
				["Issues (1y)", e.issues],
				["Reviews (1y)", e.reviews],
				["Current streak", `${e.current_streak}d`],
				["Longest streak (1y)", `${e.longest_streak}d`],
				["Stars earned", e.total_stars],
				["Followers", e.followers],
				["Public repos", e.public_repos],
				["PRs all time", e.prs_all_time],
				["Joined", e.joined ?? "—"],
			]
		: [];

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
					showGithub
					visibility={profile.section_visibility || undefined}
					profile={profile}
					activeSection="github"
				/>
				<div className={styles.container}>
					<section className={styles.profileHeader}>
						<div className={styles.headerRow}>
							<div className={styles.identity}>
								<Image
									src={
										profile.avatar_url ||
										"/default-avatar.png"
									}
									alt={
										profile.display_name || profile.username
									}
									width={82}
									height={82}
									loading="eager"
									className={styles.avatar}
								/>
								<div>
									<h1 className={styles.displayName}>
										{profile.display_name ||
											profile.username}
									</h1>
									<p className={styles.username}>
										@{profile.username}
									</p>
								</div>
							</div>
							<a
								href={`https://github.com/${profile.username}`}
								target="_blank"
								rel="noreferrer"
								className={styles.redirect}
							>
								Link Redirect ↗
							</a>
						</div>
						{profile.stack_tags.length > 0 && (
							<div className={styles.tagRow}>
								{profile.stack_tags.map((tag) => (
									<span className={styles.tag} key={tag.id}>
										{tag.name}
									</span>
								))}
							</div>
						)}
					</section>

					{show("graph") && (
						<section className={`${styles.panel}${dim("graph")}`}>
							<p className={styles.eyebrow}>
								GitHub contribution graph
							</p>
							{stats.calendar?.length ? (
								<ContributionGraph weeks={stats.calendar} />
							) : (
								<div className={styles.graphBox}>
									No data yet
								</div>
							)}
						</section>
					)}

					{show("stats") && (
						<section className={`${styles.panel}${dim("stats")}`}>
							<p className={styles.sectionLabel}>
								GitHub statistics
							</p>
							{metrics.length ? (
								<div className={styles.metricGrid}>
									{metrics.map(([label, value]) => (
										<div
											className={styles.metric}
											key={label}
										>
											<span>{label}</span>
											<strong>{value}</strong>
										</div>
									))}
								</div>
							) : (
								<p className={styles.muted}>No data yet</p>
							)}
						</section>
					)}

					{show("pinned") && (
						<section className={`${styles.panel}${dim("pinned")}`}>
							<p className={styles.eyebrow}>Pinned repos</p>
							{stats.pinned_repos?.length ? (
								<div className={styles.repoScroller}>
									{stats.pinned_repos.map((repo) => (
										<a
											key={repo.name}
											href={repo.url}
											target="_blank"
											rel="noreferrer"
											className={styles.repoCard}
										>
											<span className={styles.repoName}>
												{repo.name}
											</span>
											<p className={styles.repoDesc}>
												{repo.description ||
													"No description"}
											</p>
											<span className={styles.repoStars}>
												★ {repo.stars}
											</span>
										</a>
									))}
								</div>
							) : (
								<p className={styles.muted}>No pinned repos</p>
							)}
						</section>
					)}

					{show("languages") && (
						<section
							className={`${styles.panel}${dim("languages")}`}
						>
							<p className={styles.sectionLabel}>Top languages</p>
							{stats.top_languages?.length ? (
								<div className={styles.languageList}>
									{stats.top_languages.map((language) => (
										<span
											key={language}
											className={styles.language}
										>
											{language}
										</span>
									))}
								</div>
							) : (
								<p className={styles.muted}>No data yet</p>
							)}
						</section>
					)}

					{show("activity") && (
						<section
							className={`${styles.panel}${dim("activity")}`}
						>
							<p className={styles.sectionLabel}>
								Recent activity
							</p>
							{stats.activity?.length ? (
								<ul className={styles.activityList}>
									{stats.activity
										.slice(0, 5)
										.map((item, i) => (
											<li key={i}>
												<a
													className={
														styles.activityItem
													}
													href={item.url}
													target="_blank"
													rel="noreferrer"
												>
													<span>
														<strong>
															{item.repo}
														</strong>{" "}
														· {item.text}
													</span>
													<span
														className={
															styles.activityDate
														}
													>
														{new Date(
															item.at,
														).toLocaleDateString(
															"en",
															{
																month: "short",
																day: "numeric",
															},
														)}
													</span>
												</a>
											</li>
										))}
								</ul>
							) : (
								<p className={styles.muted}>
									No recent public activity
								</p>
							)}
						</section>
					)}
				</div>
			</div>
			</main>
		</AppShell>
	);
}
