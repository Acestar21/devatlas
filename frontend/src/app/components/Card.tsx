import Link from "next/link";
import styles from "./Card.module.css";

export default function Card({
	title,
	href,
	hrefLabel = "View all",
	action,
	muted = false,
	span = false,
	children,
}: {
	title: string;
	href?: string;
	hrefLabel?: string;
	action?: React.ReactNode;
	muted?: boolean;
	span?: boolean;
	children: React.ReactNode;
}) {
	const className = [styles.card, muted && styles.muted, span && styles.span]
		.filter(Boolean)
		.join(" ");
	return (
		<section className={className} aria-label={title}>
			<header className={styles.header}>
				<h2 className={styles.title}>{title}</h2>
				{href && (
					<Link href={href} className={styles.more}>
						{hrefLabel} <span aria-hidden="true">→</span>
					</Link>
				)}
				{action}
			</header>
			{children}
		</section>
	);
}
