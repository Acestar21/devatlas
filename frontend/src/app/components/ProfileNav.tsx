import Link from "next/link";
import { Profile } from "@/types";
import ProfileEditButton from "./ProfileEditButton";
import styles from "./ProfileNav.module.css";

export default function ProfileNav({ username, showGithub, visibility, profile, activeSection = "profile" }: { username: string; showGithub: boolean; visibility?: Partial<Record<"github" | "games" | "interests", boolean>>; profile?: Profile; activeSection?: string }) {
  const items = [
    { href: `/${username}`, icon: "home", label: "Profile", visible: true, disabled: false },
    { href: `/${username}/github`, icon: "code", label: "GitHub", visible: showGithub && (visibility?.github !== false || profile?.is_owner), disabled: false },
    { href: `/${username}/activity`, icon: "activity", label: "Activity", visible: true, disabled: false },
    { href: `/${username}/games`, icon: "game", label: "Games", visible: visibility?.games !== false || profile?.is_owner, disabled: false },
    { href: `/${username}/interests`, icon: "interest", label: "Interests", visible: visibility?.interests !== false || profile?.is_owner, disabled: false },
  ];

  const icon = (name: string) => {
    const paths: Record<string, string> = { home: "M3 10.5 12 3l9 7.5v9H14v-6h-4v6H3z", code: "m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16", activity: "M4 14c0-4 2-7 5-9l1 4 3-2c2 2 4 5 3 9-1 3-4 5-7 5s-5-3-5-7z", game: "M6 10h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5 2l-2-2h-6l-2 2a3 3 0 0 1-5-2v-3a4 4 0 0 1 4-4zM8 14v4M6 16h4M17 15h.01M20 17h.01", interest: "M4 9a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3h-1v-7h4M4 9v9h1a3 3 0 0 0 3-3v-4H4", link: "M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" };
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
  };

  return (
    <nav className={styles.nav} aria-label="Profile navigation">
      {items.filter((item) => item.visible).map((item) => (
        item.disabled ? <span key={item.label} className={`${styles.item} ${styles.disabled}`} aria-label={`${item.label} coming soon`}>
          <span className={styles.icon}>{icon(item.icon)}</span>
          <span className={styles.label}>{item.label}<small>Coming Soon</small></span>
        </span> : <Link key={item.href} href={item.href} className={`${styles.item} ${activeSection === item.label.toLowerCase() ? styles.active : ""}`}>
          <span className={styles.icon}>{icon(item.icon)}</span>
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
      {profile?.is_owner && <div className={styles.edit}><ProfileEditButton profile={profile} section={activeSection} /></div>}
      {profile?.is_owner && <Link className={styles.logout} href="/api/auth/logout">Log out</Link>}
    </nav>
  );
}
