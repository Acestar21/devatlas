import { notFound } from "next/navigation";
import Image from "next/image";
import ContributionGraph from "@/app/components/ContributionGraph";
import Panel from "@/app/components/Panel";
import ProjectCard from "@/app/components/ProjectCard";
import ProfileFrame from "@/app/components/ProfileFrame";
import { SettingsGear } from "@/app/components/SettingsProvider";
import { withBanners } from "@/lib/pinned";
import { loadProfile } from "@/lib/profile-api";
import styles from "./page.module.css";

export default async function GithubPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);

	if (
		profile.stats === null ||
		(profile.section_visibility?.github === false && !profile.is_owner)
	)
		notFound();

	const stats = profile.stats;
	const e = stats.extra;
	const projects = await withBanners(stats.pinned_repos);

	const cv = profile.card_visibility?.github ?? {};
	const show = (card: string) => (cv[card] ?? true) || profile.is_owner;
	const muted = (card: string) => !(cv[card] ?? true);

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
		<ProfileFrame profile={profile} active="github">
			<div className={styles.container}>
				<section className={styles.profileHeader}>
					<div className={styles.headerRow}>
						<div className={styles.identity}>
							<Image
								src={profile.avatar_url || "/default-avatar.png"}
								alt={profile.display_name || profile.username}
								width={82}
								height={82}
								loading="eager"
								className={styles.avatar}
							/>
							<div>
								<h1 className={styles.displayName}>{profile.display_name || profile.username}</h1>
								<p className={styles.username}>@{profile.username}</p>
							</div>
						</div>
						<div className={styles.headerActions}>
							<a
								href={`https://github.com/${profile.username}`}
								target="_blank"
								rel="noreferrer"
								className={styles.redirect}
							>
								View on GitHub ↗
							</a>
							<SettingsGear section="github" label="Edit GitHub card settings" />
						</div>
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
					<Panel label="GitHub contribution graph" muted={muted("graph")}>
						{stats.calendar?.length ? (
							<ContributionGraph weeks={stats.calendar} />
						) : (
							<div className={styles.graphBox}>No data yet</div>
						)}
					</Panel>
				)}

				{show("stats") && (
					<Panel label="GitHub statistics" muted={muted("stats")}>
						{metrics.length ? (
							<div className={styles.metricGrid}>
								{metrics.map(([label, value]) => (
									<div className={styles.metric} key={label}>
										<span>{label}</span>
										<strong>{value}</strong>
									</div>
								))}
							</div>
						) : (
							<p className={styles.muted}>No data yet</p>
						)}
					</Panel>
				)}

				{show("pinned") && (
					<Panel label="Pinned repos" muted={muted("pinned")}>
						{projects.length ? (
							<div className={styles.projectGrid}>
								{projects.map((repo) => (
									<ProjectCard
										key={repo.name}
										title={repo.name}
										description={repo.description ?? ""}
										link={repo.url}
										imgSrc={repo.banner}
										stars={repo.stars}
									/>
								))}
							</div>
						) : (
							<p className={styles.muted}>No pinned repos</p>
						)}
					</Panel>
				)}

				<div className={styles.pair}>
					{show("languages") && (
						<Panel label="Top languages" muted={muted("languages")}>
							{stats.top_languages?.length ? (
								<div className={styles.languageList}>
									{stats.top_languages.map((language) => (
										<span key={language} className={styles.language}>
											{language}
										</span>
									))}
								</div>
							) : (
								<p className={styles.muted}>No data yet</p>
							)}
						</Panel>
					)}

					{show("activity") && (
						<Panel label="Recent activity" muted={muted("activity")}>
							{stats.activity?.length ? (
								<ul className={styles.activityList}>
									{stats.activity.slice(0, 5).map((item, i) => (
										<li key={i}>
											<a className={styles.activityItem} href={item.url} target="_blank" rel="noreferrer">
												<span>
													<strong>{item.repo}</strong> · {item.text}
												</span>
												<span className={styles.activityDate}>
													{new Date(item.at).toLocaleDateString("en", {
														month: "short",
														day: "numeric",
													})}
												</span>
											</a>
										</li>
									))}
								</ul>
							) : (
								<p className={styles.muted}>No recent public activity</p>
							)}
						</Panel>
					)}
				</div>
			</div>
		</ProfileFrame>
	);
}
