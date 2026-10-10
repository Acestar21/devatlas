import Link from "next/link";
import styles from "./SubpageHeader.module.css";

export default function SubpageHeader({
	username,
	title,
	children,
}: {
	username: string;
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<header className={styles.header}>
			<div>
				<Link href={`/${username}`} className={styles.back}>
					← Overview
				</Link>
				<h1>{title}</h1>
			</div>
			{children}
		</header>
	);
}
