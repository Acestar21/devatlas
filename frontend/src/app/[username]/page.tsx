import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import styles from "./page.module.css";

async function fetchProfile(username: string): Promise<{
	data: Profile | null;
	error: string | null;
	message: string | null;
}> {
	try {
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get("devcard_session");

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/profiles/${username}`,
			{
				cache: "no-store",
				headers: sessionCookie
					? { Cookie: `devcard_session=${sessionCookie.value}` }
					: {},
			},
		);

		if (res.status === 404)
			return { data: null, error: "NOT_FOUND", message: null };
		if (!res.ok)
			return {
				data: null,
				error: "FETCH_ERROR",
				message: `Server responded with ${res.status}`,
			};

		const data: Profile = await res.json();
		return { data, error: null, message: null };
	} catch (e) {
		return {
			data: null,
			error: "NETWORK_ERROR",
			message:
				e instanceof Error ? e.message : "A network error occurred.",
		};
	}
}

const PLATFORM_LABEL: Record<string, string> = {
	steam: "Steam",
	riot: "Riot",
	psn: "PlayStation",
	xbox: "Xbox",
	other: "Profile",
};

export default async function ProfilePage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const { data: profile, error, message } = await fetchProfile(username);

	if (error === "NOT_FOUND") notFound();

	if (error) {
		return (
			<div className={styles.errorPage}>
				<p className={styles.errorMessage}>
					{message || "Something went wrong."}
				</p>
			</div>
		);
	}

	if (!profile) return null;

	const hasGithub = profile.stats !== null;
	const hasGames = profile.games !== null && profile.games.length > 0;
	const hasInterests =
		profile.interests !== null && profile.interests.length > 0;
	const hasContentLinks = profile.content_links.length > 0;

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<a href="/directory" className={styles.backLink}>
					← Back to Directory
				</a>
				{/* Header Card */}
				<div className={styles.card}>
					<header className={styles.header}>
						<Image
							src={profile.avatar_url || "/default-avatar.png"}
							alt={profile.display_name || profile.username}
							width={88}
							height={88}
							className={styles.avatar}
						/>
						<div className={styles.identity}>
							<h1 className={styles.displayName}>
								{profile.display_name || profile.username}
							</h1>
							<p className={styles.username}>@{profile.username}</p>
							{profile.bio && (
								<p className={styles.bio}>{profile.bio}</p>
							)}
						</div>
						{profile.is_owner && (
							<Link href="/settings" className={styles.editButton}>
								Edit profile
							</Link>
						)}
					</header>
				</div>

				{/* Stack tags */}
				{profile.stack_tags.length > 0 && (
					<div className={styles.card}>
						<section className={styles.section}>
							<h2 className={styles.sectionLabel}>Stack</h2>
							<div className={styles.tagRow}>
								{profile.stack_tags.map((t) => (
									<span key={t.id} className={styles.tag}>
										{t.name}
									</span>
								))}
							</div>
						</section>
					</div>
				)}

				{/* GitHub */}
				{hasGithub && profile.stats?.available && (
					<div className={styles.card}>
						<section className={styles.section}>
							<h2 className={styles.sectionLabel}>GitHub activity</h2>
							<div className={styles.statsGrid}>
								<div className={styles.statBlock}>
									<p className={styles.statValue}>
										{profile.stats.total_contributions}
									</p>
									<p className={styles.statLabel}>
										contributions
									</p>
								</div>
								<div className={styles.langBlock}>
									<p className={styles.statLabel}>
										Top languages
									</p>
									<div className={styles.tagRow}>
										{profile.stats.top_languages?.map(
											(lang) => (
												<span
													key={lang}
													className={styles.langTag}
												>
													{lang}
												</span>
											),
										)}
									</div>
								</div>
							</div>

							{profile.stats.pinned_repos &&
								profile.stats.pinned_repos.length > 0 && (
									<div className={styles.repoGrid}>
										{profile.stats.pinned_repos.map((repo) => (
											<a
												key={repo.name}
												href={repo.url}
												target="_blank"
												rel="noopener noreferrer"
												className={styles.repoCard}
											>
												<span className={styles.repoName}>
													{repo.name}
												</span>
												<p className={styles.repoDesc}>
													{repo.description ||
														"No description provided."}
												</p>
												<span className={styles.repoStars}>
													★ {repo.stars}
												</span>
											</a>
										))}
									</div>
								)}
						</section>
					</div>
				)}

				{hasGithub && !profile.stats?.available && (
					<div className={styles.card}>
						<section className={styles.section}>
							<p className={styles.unavailableNote}>
								{profile.stats?.reason ||
									"GitHub stats are temporarily unavailable."}
							</p>
						</section>
					</div>
				)}

				{/* Games */}
				{hasGames && (
					<div className={styles.card}>
						<section className={styles.section}>
							<h2 className={styles.sectionLabel}>Also plays</h2>
							<div className={styles.gameGrid}>
								{profile.games!.map((g) => (
									<a
										key={g.tag_id}
										href={g.profile_url}
										target="_blank"
										rel="noopener noreferrer"
										className={styles.gameCard}
									>
										<span className={styles.gameName}>
											{g.name}
										</span>
										<span className={styles.gamePlatform}>
											{PLATFORM_LABEL[g.platform] ||
												g.platform}
											{g.rank_or_hours
												? ` · ${g.rank_or_hours}`
												: ""}
										</span>
									</a>
								))}
							</div>
						</section>
					</div>
				)}

				{/* Interests */}
				{hasInterests && (
					<div className={styles.card}>
						<section className={styles.section}>
							<h2 className={styles.sectionLabel}>Into</h2>
							<div className={styles.tagRow}>
								{profile.interests!.map((i) => (
									<span key={i.id} className={styles.interestTag}>
										{i.name}
									</span>
								))}
							</div>
						</section>
					</div>
				)}

				{/* Content links */}
				{hasContentLinks && (
					<div className={styles.card}>
						<section className={styles.section}>
							<h2 className={styles.sectionLabel}>Links</h2>
							<p className={styles.linkDisclaimer}>
								External links — DevAtlas has not verified these
								destinations.
							</p>
							<div className={styles.linkRow}>
								{profile.content_links.map((link, i) => (
									<a
										key={i}
										href={link.url}
										target="_blank"
										rel="noopener noreferrer"
										className={styles.contentLink}
									>
										{link.label} ↗
									</a>
								))}
							</div>
						</section>
					</div>
				)}

				{/* Badge, owner only */}
				{profile.is_owner && (
					<div className={styles.card}>
						<section className={styles.section}>
							<h2 className={styles.sectionLabel}>Your badge</h2>
							<img
								src={`${process.env.NEXT_PUBLIC_API_URL}/badge/${profile.username}`}
								alt="DevAtlas badge"
								className={styles.badgePreview}
							/>
							<code className={styles.badgeCode}>
								{`![DevAtlas](${process.env.NEXT_PUBLIC_API_URL}/badge/${profile.username})`}
							</code>
						</section>
					</div>
				)}

				{profile.is_owner && (
					<a
						href="/api/auth/logout"
						className={styles.logoutButton}
					>
						Log out
					</a>
				)}
			</div>
		</main>
	);
}
