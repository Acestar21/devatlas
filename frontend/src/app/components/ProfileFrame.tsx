import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";
import BadgeEmbed from "./BadgeEmbed";
import ProfileNav from "./ProfileNav";
import { SettingsProvider } from "./SettingsProvider";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./ProfileFrame.module.css";

/**
 * Shared page chrome for the profile and every sub-page:
 * top bar, left notch nav, content slot, footer (+ owner-only badge).
 * The settings modal is owned by SettingsProvider here, once per page.
 */
export default async function ProfileFrame({
	profile,
	active,
	children,
}: {
	profile: Profile;
	active: string;
	children: React.ReactNode;
}) {
	const themeCookie = await getThemeCookie();
	const viewer = profile.is_owner ? profile : await fetchViewer();

	return (
		<main className={styles.page}>
			<SettingsProvider profile={profile}>
				<header className={styles.topBar}>
					<Link href="/directory" className={styles.brand}>
						DevAtlas
					</Link>
					<div className={styles.topActions}>
						<ThemeSwitcher initialTheme={themeCookie || profile.theme} mobileIcon />
						<Link href="/directory" className={styles.topLink}>
							/Directory
						</Link>
						{viewer ? (
							<Link href={`/${viewer.username}`} aria-label="Open your profile">
								<Image
									src={viewer.avatar_url || "/default-avatar.png"}
									alt="Your profile"
									width={40}
									height={40}
									loading="eager"
									className={styles.viewerAvatar}
								/>
							</Link>
						) : (
							<Link href="/directory?login=1" className={styles.topLink}>
								/login
							</Link>
						)}
					</div>
				</header>

				<ProfileNav
					username={profile.username}
					showGithub={profile.stats !== null}
					visibility={profile.section_visibility || undefined}
					profile={profile}
					activeSection={active}
				/>

				<div className={styles.shell}>{children}</div>

				<footer className={styles.footer}>
					<div className={styles.divider} />
					<div className={styles.footerRow}>
						<div className={styles.footerText}>
							<nav className={styles.links} aria-label="Footer navigation">
								<a href="https://github.com/Acestar21/devatlas">github</a>
								<Link href="/contribute">contribute</Link>
								<Link href="/report-issue">report-issue</Link>
								<Link href="/about">about</Link>
								<Link href="/privacy">privacy</Link>
								<Link href="/rules">rules</Link>
							</nav>
							<p className={styles.disclaimer}>
								DevAtlas is an independent community project. Information may be
								outdated or inaccurate; verify important information with official
								sources. Running on free hosting - occasional slow loads are expected.
							</p>
							<p className={styles.meta}>
								© 2026 DevAtlas · Open source · Built for developers
							</p>
						</div>
						{/* Only the profile's owner ever sees the badge; everyone else gets the plain footer. */}
						{profile.is_owner && (
							<div className={styles.badge}>
								<BadgeEmbed username={profile.username} />
							</div>
						)}
					</div>
				</footer>
			</SettingsProvider>
		</main>
	);
}
