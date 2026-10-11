import Link from "next/link";
import styles from "./SiteFooter.module.css";

export default function SiteFooter({
	badge,
	clearRail = false,
}: {
	badge?: React.ReactNode;
	/** profile pages: leave room for the fixed notch nav on the left edge */
	clearRail?: boolean;
}) {
	return (
		<footer className={`${styles.footer} ${clearRail ? styles.rail : ""}`}>
			<div className={styles.divider} />
			<div className={styles.row}>
				<div className={styles.text}>
					<nav className={styles.links} aria-label="Footer navigation">
						<a href="https://github.com/Acestar21/devatlas">github</a>
						<Link href="/contribute">contribute</Link>
						<Link href="/report-issue">report-issue</Link>
						<Link href="/about">about</Link>
						<Link href="/privacy">privacy</Link>
						<Link href="/rules">rules</Link>
					</nav>
					<p className={styles.disclaimer}>
						DevAtlas is an independent community project. Information may
						be outdated or inaccurate; verify important information with
						official sources. Running on free hosting - occasional slow
						loads are expected.
					</p>
					<p className={styles.meta}>
						© 2026 DevAtlas · Open source · Built for developers
					</p>
				</div>
				{badge && <div className={styles.badge}>{badge}</div>}
			</div>
		</footer>
	);
}
