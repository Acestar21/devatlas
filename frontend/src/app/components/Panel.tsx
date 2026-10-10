import Link from "next/link";
import { SettingsGear } from "./SettingsProvider";
import styles from "./Panel.module.css";

/**
 * Standard card used on the profile and its sub-pages.
 * Header: label on the left; "View all" and the owner-only settings gear on the right.
 * The body is a flex column that fills the card, so cards in the same grid row
 * stretch to one height instead of ending at their own content.
 */
export default function Panel({
	label,
	gearSection,
	gearLabel,
	viewAllHref,
	muted = false,
	className = "",
	children,
}: {
	label: string;
	gearSection?: string;
	gearLabel?: string;
	viewAllHref?: string;
	muted?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<section className={`${styles.panel} ${muted ? styles.muted : ""} ${className}`}>
			<header className={styles.header}>
				<h2 className={styles.label}>{label}</h2>
				<div className={styles.actions}>
					{viewAllHref && (
						<Link href={viewAllHref} className={styles.viewAll}>
							View all →
						</Link>
					)}
					{gearSection && <SettingsGear section={gearSection} label={gearLabel} />}
				</div>
			</header>
			<div className={styles.body}>{children}</div>
		</section>
	);
}
