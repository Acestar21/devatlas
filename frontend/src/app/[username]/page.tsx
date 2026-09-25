import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import ProfileNav from "@/app/components/ProfileNav";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import BadgeEmbed from "@/app/components/BadgeEmbed";
import BioText from "@/app/components/BioText";
import styles from "./page.module.css";
import { getSessionCookieValue, getThemeCookie, sessionHeaders } from "@/lib/server-context";

async function fetchProfile(username: string): Promise<Profile | null> {
	const sessionCookie = await getSessionCookieValue();
	const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/${username}`, {
		cache: "no-store",
		headers: sessionHeaders(sessionCookie),
	});
	if (response.status === 404) notFound();
	if (!response.ok) return null;
	return response.json();
}

const PLATFORM_LABEL: Record<string, string> = { steam: "Steam", riot: "Riot", psn: "PlayStation", xbox: "Xbox", other: "Profile" };

async function fetchViewer() {
	const sessionCookie = await getSessionCookieValue();
	if (!sessionCookie) return null;
	const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, { cache: "no-store", headers: sessionHeaders(sessionCookie) });
	return response.ok ? response.json() as Promise<Profile> : null;
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
	const { username } = await params;
	const [profile, viewer] = await Promise.all([
	fetchProfile(username),
	fetchViewer(),
	]);
	const themeCookie = await getThemeCookie();
	if (!profile) return <div className={styles.errorPage}>Coming Soon</div>;
	const visibility = profile.section_visibility || { github: true, leetcode: true, games: true, interests: true };
	const hasGames = profile.games !== null && (profile.games.length > 0 || profile.is_owner);
	const hasInterests = profile.interests !== null && (profile.interests.length > 0 || profile.is_owner);
	const hasLinks = profile.content_links.length > 0;

	return (
		<main className={styles.page}>
			<header className={styles.topBar}>
				<Link href="/directory" className={styles.brand}>DevAtlas</Link>
				<div className={styles.topActions}>
					<ThemeSwitcher initialTheme={themeCookie || profile.theme} />
					<Link href="/directory" className={styles.topLink}>/Directory</Link>
					{viewer ? <Link href={`/${viewer.username}`} aria-label="Open your profile"><Image src={viewer.avatar_url || "/default-avatar.png"} alt="Your profile" width={40} height={40} loading="eager" className={styles.viewerAvatar} /></Link> : <Link href="/directory?login=1" className={styles.topLink}>/login</Link>}
				</div>
			</header>
			<div className={styles.layout}>
				<ProfileNav username={profile.username} showGithub={profile.stats !== null} visibility={visibility} profile={profile} activeSection="profile" />
				<div className={styles.container}>
					<section className={styles.profileCard}>
						<div className={styles.banner} />
						<div className={styles.profileBody}>
							<Image src={profile.avatar_url || "/default-avatar.png"} alt={profile.display_name || profile.username} width={96} height={96} loading="eager" className={styles.avatar} />
							<div className={styles.identity}><h1>{profile.display_name || profile.username}</h1><p>@{profile.username}</p>{profile.bio && <BioText text={profile.bio} className={styles.bio} />}</div>
							<div className={styles.profileLinks}>
								{profile.content_links.filter((link) => !["linkedin", "github"].includes(link.label.toLowerCase())).slice(0, 1).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" aria-label="Open portfolio" className={`${styles.social} ${styles.portfolio}`}>↗</a>)}
								{profile.content_links.filter((link) => link.label.toLowerCase() === "github").slice(0, 1).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" aria-label="Open GitHub profile" className={`${styles.external} ${styles.github}`}>GH</a>)}
								{profile.content_links.filter((link) => link.label.toLowerCase() === "linkedin").slice(0, 1).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" aria-label="Open LinkedIn" className={`${styles.social} ${styles.linkedin}`}>in</a>)}
							</div>
						</div>
						{profile.stack_tags.length > 0 ? <div className={styles.tagRow}>{profile.stack_tags.map((tag) => <span key={tag.id} className={styles.tag}>{tag.name}</span>)}</div> : <p className={styles.muted}>Stack: Coming Soon</p>}
					</section>
					{(visibility.github || profile.is_owner) && <section className={`${styles.panel} ${!visibility.github ? styles.hiddenSection : ""}`}>
						<div className={styles.activityHeader}><div><p className={styles.eyebrow}>GitHub activity</p><p className={styles.statValue}>{profile.stats?.available ? profile.stats.total_contributions : "Coming Soon"}</p><p className={styles.muted}>contributions</p></div><div className={styles.muted}>Streak: Coming Soon</div></div>
						<div className={styles.graphPlaceholder}>Contribution graph: Coming Soon</div><p className={styles.muted}>Joined GitHub: Coming Soon</p>
					</section>}
					{(visibility.leetcode || profile.is_owner) && <section className={`${styles.panel} ${!visibility.leetcode ? styles.hiddenSection : ""}`}><p className={styles.sectionLabel}>LeetCode</p><p className={styles.muted}>Coming Soon</p></section>}
					<div className={`${styles.twoColumn} ${hasGames && hasInterests ? "" : styles.singleColumn}`}>
						{hasGames && <section className={`${styles.panel} ${!visibility.games ? styles.hiddenSection : ""}`}><p className={styles.sectionLabel}>Games</p>{profile.games?.length ? <div className={styles.gameList}>{profile.games.map((game) => <a key={game.tag_id} href={game.profile_url} target="_blank" rel="noreferrer" className={styles.gameCard}><strong>{game.name}</strong><span>{PLATFORM_LABEL[game.platform] || game.platform}{game.rank_or_hours ? ` · ${game.rank_or_hours}` : ""}</span></a>)}</div> : <p className={styles.muted}>Nothing added yet.</p>}</section>}
						{hasInterests && <section className={`${styles.panel} ${!visibility.interests ? styles.hiddenSection : ""}`}><p className={styles.sectionLabel}>Interests</p>{profile.interests?.length ? <div className={styles.tagRow}>{profile.interests.map((interest) => <span key={interest.id} className={styles.tag}>{interest.name}</span>)}</div> : <p className={styles.muted}>Nothing added yet.</p>}</section>}
					</div>
					{(hasLinks || profile.is_owner) && <div className={profile.is_owner ? styles.linksRow : styles.linksOnly}>
						{hasLinks && <section className={styles.panel}><div className={styles.sectionHeading}><p className={styles.sectionLabel}>Links</p>{profile.is_owner && <ProfileEditButton profile={profile} section="links" />}</div><div className={styles.linkRow}>{profile.content_links.map((link, index) => <a key={index} href={link.url} target="_blank" rel="noreferrer" className={styles.contentLink}>{link.label} ↗</a>)}</div></section>}
						{profile.is_owner && <BadgeEmbed username={profile.username} />}
					</div>}
				</div>
			</div>
			<footer className={styles.footer}>
				<div className={styles.divider} />
				<nav className={styles.links} aria-label="Footer navigation">
					<a href="https://github.com/Acestar21/devatlas">github</a>
					<Link href="/contribute">contribute</Link>
					<Link href="/report-issue">report-issue</Link>
					<Link href="/about">about</Link>
				</nav>
				<p className={styles.disclaimer}>DevAtlas is an independent community project. Information may be outdated or inaccurate; verify important information with official sources.
					Running on free hosting - occasional slow loads are expected.
				</p>
				<p className={styles.meta}>© 2026 DevAtlas · Open source · Built for developers</p>
			</footer>
		</main>
	);
}
