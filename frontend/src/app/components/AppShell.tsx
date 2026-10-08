import Image from "next/image";
import Link from "next/link";
import ThemeSwitcher from "./ThemeSwitcher";
import MobileNav from "./MobileNav";
import styles from "./AppShell.module.css";

type Viewer = {
	username: string;
	avatar_url: string | null;
};

export default function AppShell({
	children,
	viewer,
	initialTheme,
	showDisclaimer = false,
}: {
	children: React.ReactNode;
	viewer: Viewer | null;
	initialTheme: string;
	showDisclaimer?: boolean;
}) {
	return (
		<>
			<header className={styles.topBar}>
				<div className={styles.topBarInner}>
					<Link href="/directory" className={styles.brand}>
						DevAtlas
					</Link>
					<div className={styles.desktopActions}>
						<ThemeSwitcher
							initialTheme={initialTheme}
							mobileIcon
						/>
						<Link href="/directory" className={styles.topLink}>
							/Directory
						</Link>
						{viewer ? (
							<Link
								href={`/${viewer.username}`}
								aria-label="Open your profile"
							>
								<Image
									src={
										viewer.avatar_url ||
										"/default-avatar.png"
									}
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
								className={styles.topLink}
							>
								/login
							</Link>
						)}
					</div>
					<MobileNav viewer={viewer} initialTheme={initialTheme} />
				</div>
			</header>
			{children}
			<footer className={styles.footer}>
				<div className={styles.divider} />
				<nav className={styles.links} aria-label="Footer navigation">
					<a href="https://github.com/Acestar21/devatlas">github</a>
					<Link href="/contribute">contribute</Link>
					<Link href="/report-issue">report-issue</Link>
					<Link href="/about">about</Link>
					<Link href="/privacy">privacy</Link>
					<Link href="/rules">rules</Link>
				</nav>
				{showDisclaimer && (
					<>
						<p className={styles.disclaimer}>
							DevAtlas is an independent community project.
							Information may be outdated or inaccurate; verify
							important information with official sources. Running
							on free hosting - occasional slow loads are expected.
						</p>
						<p className={styles.meta}>
							© 2026 DevAtlas · Open source · Built for developers
						</p>
					</>
				)}
			</footer>
		</>
	);
}
