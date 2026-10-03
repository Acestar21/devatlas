import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import ProfileNav from "./ProfileNav";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./SectionPlaceholder.module.css";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";

export default async function SectionPlaceholder({
	profile,
	title,
	children,
}: {
	profile: Profile;
	title: string;
	children?: React.ReactNode;
}) {
	const activeSection = title.toLowerCase();
	const themeCookie = await getThemeCookie();
	const viewer = profile.is_owner ? profile : await fetchViewer();
	return (
		<main className={styles.page}>
			<header className={styles.topBar}>
				<Link href="/directory" className={styles.brand}>
					DevAtlas
				</Link>
				<div className={styles.actions}>
					<ThemeSwitcher
						initialTheme={themeCookie || profile.theme}
						mobileIcon
					/>
					<Link href="/directory" className={styles.directory}>
						/Directory
					</Link>
					{viewer ? (
						<Link
							href={`/${viewer.username}`}
							aria-label="Open your profile"
						>
							<Image
								src={viewer.avatar_url || "/default-avatar.png"}
								alt="Your profile"
								width={40}
								height={40}
								loading="eager"
								className={styles.avatar}
							/>
						</Link>
					) : (
						<Link
							href="/directory?login=1"
							className={styles.login}
						>
							/login
						</Link>
					)}
				</div>
			</header>
			<div className={styles.layout}>
				<ProfileNav
					username={profile.username}
					showGithub={profile.stats !== null}
					visibility={profile.section_visibility || undefined}
					profile={profile}
					activeSection={activeSection}
				/>
				{children ? (
					<div className={styles.content}>{children}</div>
				) : (
					<section className={styles.panel}>
						<p className={styles.eyebrow}>{title}</p>
						<h1>{title}</h1>
						<p>Coming Soon</p>
					</section>
				)}
			</div>
			<footer className={styles.footer}>
				<div className={styles.divider} />
				<nav className={styles.links} aria-label="Footer navigation">
					<a href="https://github.com/Acestar21/devatlas">github</a>
					<Link href="/contribute">contribute</Link>
					<Link href="/report-issue">report-issue</Link>
					<Link href="/about">about</Link>
				</nav>
				<p className={styles.disclaimer}>
					DevAtlas is an independent community project. Information
					may be outdated or inaccurate; verify important information
					with official sources. Running on free hosting - occasional
					slow loads are expected.
				</p>
				<p className={styles.meta}>
					© 2026 DevAtlas · Open source · Built for developers
				</p>
			</footer>
		</main>
	);
}
