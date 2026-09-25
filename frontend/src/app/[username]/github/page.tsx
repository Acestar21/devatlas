import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import ProfileNav from "@/app/components/ProfileNav";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
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

async function fetchViewer(): Promise<Profile | null> {
  const sessionCookie = await getSessionCookieValue();
  if (!sessionCookie) return null;
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, { cache: "no-store", headers: sessionHeaders(sessionCookie) });
  return response.ok ? response.json() : null;
}

export default async function GithubPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await fetchProfile(username);
  const viewer = await fetchViewer();
  const themeCookie = await getThemeCookie();
  if (!profile || profile.stats === null || (profile.section_visibility?.github === false && !profile.is_owner)) notFound();
  const stats = profile.stats;

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/directory" className={styles.brand}>DevAtlas</Link>
        <div className={styles.topActions}><ThemeSwitcher initialTheme={themeCookie || profile.theme} /><Link href="/directory" className={styles.topLink}>/Directory</Link>{viewer ? <Link href={`/${viewer.username}`} aria-label="Open your profile"><Image src={viewer.avatar_url || "/default-avatar.png"} alt="Your profile" width={40} height={40} loading="eager" className={styles.viewerAvatar} /></Link> : <Link href="/directory?login=1" className={styles.topLink}>/login</Link>}</div>
      </header>
      <div className={styles.layout}>
        <ProfileNav username={profile.username} showGithub visibility={profile.section_visibility || undefined} profile={profile} activeSection="github" />
        <div className={styles.container}>
          <section className={styles.profileHeader}>
            <div className={styles.headerRow}><div className={styles.identity}><Image src={profile.avatar_url || "/default-avatar.png"} alt={profile.display_name || profile.username} width={82} height={82} loading="eager" className={styles.avatar} /><div><h1 className={styles.displayName}>{profile.display_name || profile.username}</h1><p className={styles.username}>@{profile.username}</p></div></div><a href={`https://github.com/${profile.username}`} target="_blank" rel="noreferrer" className={styles.redirect}>Link Redirect ↗</a></div>
            {profile.stack_tags.length > 0 && <div className={styles.tagRow}>{profile.stack_tags.map((tag) => <span className={styles.tag} key={tag.id}>{tag.name}</span>)}</div>}
          </section>
          <section className={styles.panel}><p className={styles.eyebrow}>GitHub contribution graph</p><div className={styles.graphBox}>Coming Soon</div></section>
          <section className={styles.panel}><p className={styles.eyebrow}>Pinned Repos | Horizontal scroll</p>{stats.pinned_repos?.length ? <div className={styles.repoScroller}>{stats.pinned_repos.map((repo) => <a key={repo.name} href={repo.url} target="_blank" rel="noreferrer" className={styles.repoCard}><span className={styles.repoName}>{repo.name}</span><p className={styles.repoDesc}>{repo.description || "Coming Soon"}</p><span className={styles.repoStars}>* {repo.stars}</span></a>)}</div> : <p className={styles.muted}>Coming Soon</p>}</section>
          <div className={styles.twoColumn}><section className={styles.panel}><p className={styles.sectionLabel}>Top languages</p>{stats.top_languages?.length ? <div className={styles.languageList}>{stats.top_languages.map((language) => <span key={language} className={styles.language}>{language}</span>)}</div> : <p className={styles.muted}>Coming Soon</p>}</section><section className={styles.panel}><p className={styles.sectionLabel}>GitHub statistics</p><p className={styles.statValue}>{stats.total_contributions ?? "Coming Soon"}</p><p className={styles.muted}>total contributions</p></section></div>
          <section className={styles.panel}><p className={styles.sectionLabel}>Recent activities</p><p className={styles.muted}>Coming Soon</p></section>
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
