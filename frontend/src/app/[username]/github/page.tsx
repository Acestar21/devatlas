import { notFound } from "next/navigation";
import ContributionGraph from "@/app/components/ContributionGraph";
import Card from "@/app/components/Card";
import ProjectCard from "@/app/components/ProjectCard";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import SubpageHeader from "@/app/components/SubpageHeader";
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
		<>
			<SubpageHeader username={profile.username} title="GitHub">
				<a
					href={`https://github.com/${profile.username}`}
					target="_blank"
					rel="noreferrer"
					className={styles.redirect}
				>
					View on GitHub ↗
				</a>
			</SubpageHeader>
			<div className={styles.container}>
				{show("graph") && (
					<Card title="GitHub contribution graph" muted={muted("graph")} action={<ProfileEditButton section="github" />}>
						{stats.calendar?.length ? (
							<ContributionGraph weeks={stats.calendar} />
						) : (
							<div className={styles.graphBox}>No data yet</div>
						)}
					</Card>
				)}

				{show("stats") && (
					<Card title="GitHub statistics" muted={muted("stats")} action={<ProfileEditButton section="github" />}>
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
					</Card>
				)}

				{show("pinned") && (
					<Card title="Pinned repos" muted={muted("pinned")} action={<ProfileEditButton section="github" />}>
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
					</Card>
				)}

				<div className={styles.pair}>
					{show("languages") && (
						<Card title="Top languages" muted={muted("languages")} action={<ProfileEditButton section="github" />}>
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
						</Card>
					)}

					{show("activity") && (
						<Card title="Recent activity" muted={muted("activity")} action={<ProfileEditButton section="github" />}>
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
						</Card>
					)}
				</div>
			</div>
		</>
	);
}
