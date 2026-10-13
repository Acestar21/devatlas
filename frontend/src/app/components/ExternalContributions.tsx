import { ExternalContribution } from "@/types";
import { StarIcon } from "./icons";
import styles from "./ExternalContributions.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Contributions to PUBLIC repositories the user does not own (last 12 months), from GitHub's own
 * contribution data. Repos they merely own, fork or can access never appear unless they
 * actually committed, opened PRs/issues or reviewed there.
 */
export default function ExternalContributions({ items }: { items: ExternalContribution[] }) {
	return (
		<>
			<p className={styles.note}>Public repos they don&apos;t own · last 12 months</p>
			<ul className={styles.list}>
				{items.map((item) => {
					const parts = [
						item.pull_requests > 0 && plural(item.pull_requests, "pull request", "pull requests"),
						item.commits > 0 && plural(item.commits, "commit", "commits"),
						item.issues > 0 && plural(item.issues, "issue", "issues"),
						item.reviews > 0 && plural(item.reviews, "review", "reviews"),
					].filter(Boolean) as string[];
					return (
						<li key={item.repo} className={styles.row}>
							<div className={styles.head}>
								<a href={item.url} target="_blank" rel="noreferrer" className={styles.repo}>
									<span className={styles.owner}>{item.owner}/</span>
									{item.repo.split("/")[1]}
								</a>
								{item.is_org && <span className={styles.badge}>org</span>}
								{item.stars > 0 && (
									<span className={styles.stars} title={`${item.stars} stars`}>
										<StarIcon />
										{item.stars.toLocaleString("en")}
									</span>
								)}
							</div>
							<p className={styles.parts}>{parts.join(" · ")}</p>
						</li>
					);
				})}
			</ul>
		</>
	);
}
