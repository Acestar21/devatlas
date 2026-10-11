import Link from "next/link";
import SiteFooter from "./SiteFooter";
import SiteTopBar from "./SiteTopBar";
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
			<SiteTopBar />
			<article className={styles.body}>
				<h1>{title}</h1>
				{children}
				<p className={styles.back}>
					<Link href="/directory">← Back to directory</Link>
				</p>
			</article>
			<SiteFooter />
		</main>
	);
}
