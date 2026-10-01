import { Post } from "@/types";
import { formatDate, hostOf } from "@/lib/format";
import styles from "./PostCard.module.css";

export default function PostCard({ post }: { post: Post }) {
	const meta = [
		post.date ? formatDate(post.date) : null,
		post.read_minutes ? `${post.read_minutes} min read` : null,
		hostOf(post.url) || null,
	].filter(Boolean);

	return (
		<article className={styles.card}>
			{meta.length > 0 && (
				<p className={styles.meta}>{meta.join(" · ")}</p>
			)}
			<h3 className={styles.title}>
				<a href={post.url} target="_blank" rel="noreferrer">
					{post.title}
				</a>
			</h3>
			{post.description && (
				<p className={styles.excerpt}>{post.description}</p>
			)}
			<div className={styles.footer}>
				{post.tags?.length ? (
					<div className={styles.tags}>
						{post.tags.map((tag) => (
							<span key={tag}>{tag}</span>
						))}
					</div>
				) : (
					<span />
				)}
				<a
					href={post.url}
					target="_blank"
					rel="noreferrer"
					className={styles.read}
				>
					Read post ↗
				</a>
			</div>
		</article>
	);
}
