import Link from "next/link";
import styles from "./StaticPage.module.css";

export default function StaticPage({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<main className={styles.page}>
			<header className={styles.top}>
				<Link href="/directory" className={styles.brand}>
					DevAtlas
				</Link>
			</header>
			<article className={styles.body}>
				<h1>{title}</h1>
				{children}
				<p className={styles.back}>
					<Link href="/directory">← Back to directory</Link>
				</p>
			</article>
		</main>
	);
}
