import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import ProfileNav from "./ProfileNav";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./SectionPlaceholder.module.css";
import { getThemeCookie } from "@/lib/server-context";

export default async function SectionPlaceholder({ profile, title }: { profile: Profile; title: string }) {
  const activeSection = title.toLowerCase();
  const themeCookie = await getThemeCookie();
  return <main className={styles.page}><header className={styles.topBar}><Link href="/directory" className={styles.brand}>DevAtlas</Link><div className={styles.actions}><ThemeSwitcher initialTheme={themeCookie || profile.theme} /><Link href="/directory" className={styles.directory}>/Directory</Link>{profile.is_owner ? <Link href={`/${profile.username}`} aria-label="Open your profile"><Image src={profile.avatar_url || "/default-avatar.png"} alt="Your profile" width={40} height={40} loading="eager" className={styles.avatar} /></Link> : <Link href="/directory?login=1" className={styles.login}>/login</Link>}</div></header><div className={styles.layout}><ProfileNav username={profile.username} showGithub={profile.stats !== null} visibility={profile.section_visibility || undefined} profile={profile} activeSection={activeSection} /><section className={styles.panel}><p className={styles.eyebrow}>{title}</p><h1>{title}</h1><p>Coming Soon</p></section></div></main>;
}