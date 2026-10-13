import Image from "next/image";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteTopBar from "@/app/components/SiteTopBar";
import { backendFetch } from "@/lib/backend";
import { GENRES, genreLabel, nowMs, timeAgo, timeLeft } from "@/lib/journal";
import { fetchViewerSummary } from "@/lib/server-context";
import RemoveEntryButton from "./RemoveEntryButton";
import styles from "./page.module.css";

export const metadata = { title: "Journal · DevAtlas" };

interface FeedEntry {
	id: number;
	body: string;
	genre: string | null;
	created_at: string;
	expires_at: string;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
}
interface Feed {
	page: number;
	total: number;
	total_pages: number;
	results: FeedEntry[];
}

async function fetchFeed(genre?: string, page?: string): Promise<Feed> {
	const qs = new URLSearchParams();
	if (genre && GENRES.some((g) => g.id === genre)) qs.set("genre", genre);
	if (page && /^\d{1,3}$/.test(page)) qs.set("page", page);
	const res = await backendFetch(`journal?${qs}`);
	if (!res.ok) throw new Error(`Journal API returned ${res.status}`);
	return res.json();
}

export default async function JournalPage({
	searchParams,
}: {
	searchParams: Promise<{ genre?: string; page?: string }>;
}) {
	const { genre, page } = await searchParams;
	const [feed, viewer] = await Promise.all([fetchFeed(genre, page), fetchViewerSummary()]);
	const now = nowMs();
	const isStaff = viewer?.viewer_role === "moderator" || viewer?.viewer_role === "admin";
	const href = (g?: string, p?: number) => {
		const qs = new URLSearchParams();
		if (g) qs.set("genre", g);
		if (p && p > 1) qs.set("page", String(p));
		return qs.size ? `/journal?${qs}` : "/journal";
	};

	return (
		<main className={styles.page}>
			<SiteTopBar active="journal" />
			<div className={styles.container}>
				<header className={styles.header}>
					<h1>Journal</h1>
					<p className={styles.subtitle}>
						Short updates from developers. Every entry disappears 24 hours after it&apos;s posted.
					</p>
					<p className={styles.cta}>
						{viewer ? (
							<Link href={`/${viewer.username}?tab=activity`}>Post your own →</Link>
						) : (
							<Link href="/directory?login=1">Log in with GitHub to post →</Link>
						)}
					</p>
				</header>

				<nav className={styles.filters} aria-label="Filter by category">
					<Link href={href()} className={!genre ? styles.on : ""}>
						All
					</Link>
					{GENRES.map(({ id, label }) => (
						<Link key={id} href={href(id)} className={genre === id ? styles.on : ""}>
							{label}
						</Link>
					))}
				</nav>

				{feed.results.length === 0 ? (
					<div className={styles.empty}>
						<p>Nothing live right now.</p>
						<p>Entries show up here as people post them.</p>
					</div>
				) : (
					<ul className={styles.list}>
						{feed.results.map((entry) => {
							const label = genreLabel(entry.genre);
							return (
								<li key={entry.id} className={styles.entry}>
									<Link href={`/${entry.username}`} className={styles.author}>
										<Image
											src={entry.avatar_url || "/default-avatar.png"}
											alt=""
											width={36}
											height={36}
											className={styles.avatar}
										/>
										<span>
											<strong>{entry.display_name || entry.username}</strong>
											<small>@{entry.username}</small>
										</span>
									</Link>
									<p className={styles.body}>{entry.body}</p>
									<div className={styles.meta}>
										{label && <span className={styles.genre}>{label}</span>}
										<span>{timeAgo(entry.created_at, now)}</span>
										<span aria-hidden="true">·</span>
										<span>{timeLeft(entry.expires_at, now)}</span>
										{isStaff && <RemoveEntryButton id={entry.id} />}
									</div>
								</li>
							);
						})}
					</ul>
				)}

				{feed.total_pages > 1 && (
					<nav className={styles.pagination} aria-label="Pagination">
						{feed.page > 1 && <Link href={href(genre, feed.page - 1)}>← Newer</Link>}
						<span>
							{feed.page} / {feed.total_pages}
						</span>
						{feed.page < feed.total_pages && <Link href={href(genre, feed.page + 1)}>Older →</Link>}
					</nav>
				)}
			</div>
			<SiteFooter />
		</main>
	);
}
