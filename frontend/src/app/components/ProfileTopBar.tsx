import Link from "next/link";
import ThemeSwitcher from "./ThemeSwitcher";
import ProfileMenu from "./ProfileMenu";
import styles from "./ProfileTopBar.module.css";

export default function ProfileTopBar({
	viewer,
	theme,
	active,
}: {
	viewer: { username: string; avatar_url: string | null } | null;
	theme: string;
	active?: "directory" | "journal";
}) {
	return (
		<header className={styles.bar}>
			<Link href="/directory" className={styles.brand}>
				DevAtlas<span aria-hidden="true">_</span>
			</Link>
			<div className={styles.actions}>
				<div className={styles.desktopActions}>
					<ThemeSwitcher initialTheme={theme} mobileIcon />
					<Link
						href="/directory"
						className={`${styles.pill} ${active === "directory" ? styles.pillActive : ""}`}
						aria-current={active === "directory" ? "page" : undefined}
					>
						/Directory
					</Link>
					<Link
						href="/journal"
						className={`${styles.pill} ${active === "journal" ? styles.pillActive : ""}`}
						aria-current={active === "journal" ? "page" : undefined}
					>
						/Journal
					</Link>
				</div>
				{viewer ? (
					<ProfileMenu viewer={viewer} theme={theme} />
				) : (
					<Link href="/directory?login=1" className={styles.pill}>
						/login
					</Link>
				)}
			</div>
		</header>
	);
}
