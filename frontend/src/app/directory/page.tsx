import { DirectoryResponse } from "@/types-directory";
import Image from "next/image";
import Link from "next/link";
import DirectoryControls from "./DirectoryControls";
import LoginModal from "@/app/components/LoginModal";
import SiteFooter from "@/app/components/SiteFooter";
import SiteTopBar from "@/app/components/SiteTopBar";
import styles from "./page.module.css";
import { backendFetch } from "@/lib/backend";

const BANNER_EXTS = ["jpg", "webp", "png" ] as const;

async function fetchDirectory(params: {
	search?: string;
	stack?: string;
	sort?: string;
	page?: string;
	login?: string;
}): Promise<DirectoryResponse> {
	const qs = new URLSearchParams();
	if (params.search) qs.set("search", params.search);
	if (params.stack) qs.set("stack", params.stack);
	if (params.sort) qs.set("sort", params.sort);
	if (params.page) qs.set("page", params.page);

	const res = await backendFetch(`directory?${qs.toString()}`);
	if (!res.ok) throw new Error(`Directory API returned ${res.status}`);
	return res.json();
}

/**
 * Directory banners are NOT checked or stored. The card just points a CSS background at
 * <user>/<user>/devatlas/banner.jpg; if the file doesn't exist the browser paints nothing for
 * that layer and the theme gradient underneath shows. GitHub usernames are [A-Za-z0-9-], and we
 * validate anyway before building the URL.
 */
function bannerStyle(username: string): React.CSSProperties | undefined {
	if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) return undefined;
	const layers = BANNER_EXTS.map(
		(ext) => `url("https://raw.githubusercontent.com/${username}/${username}/HEAD/devatlas/banner.${ext}")`,
	).join(", ");
	return { ["--banner-img" as string]: layers };
}

const HINT_PREFIX: Record<string, string> = {
	game: "Also plays",
	interest: "Into",
};

const LOGIN_ERRORS: Record<string, string> = {
	denied: "Login was cancelled.",
	invalid_state: "Your login session expired. Please try again.",
	github_failed: "GitHub didn't complete the sign-in. Please try again.",
	backend:
		"The DevAtlas server didn't respond (free hosting can take a minute to wake up). Please try again.",
	config: "Login isn't configured correctly. Please try again later.",
	github_unreachable: "GitHub didn't respond. Please try again in a moment.",
	username_conflict:
		"That GitHub username is already linked to another DevAtlas account. Please contact us via report-issue.",
	reserved_username: "That GitHub username matches a reserved DevAtlas page, so it can't sign up yet. Please contact us via report-issue.",
	failed: "Login failed. Please try again.",
};

function noticeFor(params: {
	login_error?: string;
	wait?: string;
	deleted?: string;
}): string | null {
	if (params.deleted === "1")
		return "Your DevAtlas account was deleted and DevAtlas' access to your GitHub account was revoked.";
	if (params.deleted === "manual")
		return "Your DevAtlas account was deleted, but we couldn't reach GitHub to revoke access. Remove DevAtlas manually at github.com/settings/applications.";
	if (params.login_error === "account_too_new") {
		const wait = /^\d{1,3}$/.test(params.wait ?? "")
			? Number(params.wait)
			: null;
		return `GitHub accounts must be at least 30 days old to sign up for DevAtlas. This keeps out bots and throwaway accounts.${wait ? ` Try again in ${wait} day${wait === 1 ? "" : "s"}.` : ""}`;
	}
	return params.login_error
		? (LOGIN_ERRORS[params.login_error] ?? LOGIN_ERRORS.failed)
		: null;
}

function bioPreview(value: string, limit = 112): string {
	if (value.length <= limit) return value;
	const shortened = value.slice(0, limit - 3).trimEnd();
	const lastSpace = shortened.lastIndexOf(" ");
	return `${shortened.slice(0, lastSpace > 60 ? lastSpace : shortened.length)}...`;
}

/** 1 … 4 5 6 … 12 — never more than 7 slots. */
function pageWindow(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = new Set([1, total, current - 1, current, current + 1]);
	const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((x, y) => x - y);
	const out: (number | "…")[] = [];
	sorted.forEach((p, i) => {
		if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
		out.push(p);
	});
	return out;
}

export default async function DirectoryPage({
	searchParams,
}: {
	searchParams: Promise<{
		search?: string;
		stack?: string;
		sort?: string;
		page?: string;
		login?: string;
		login_error?: string;
		wait?: string;
		deleted?: string;
	}>;
}) {
	const params = await searchParams;
	const { login_error: loginError, wait, deleted, ...listParams } = params;
	const notice = noticeFor({ login_error: loginError, wait, deleted });
	const data = await fetchDirectory(listParams);
	const filtered = Boolean(listParams.search || listParams.stack);
	const pageHref = (page: number) =>
		`/directory?${new URLSearchParams({ ...listParams, page: String(page) } as Record<string, string>)}`;

	return (
		<main className={styles.page}>
			<SiteTopBar active="directory" />
			<div className={styles.container}>
				{notice && (
					<p className={styles.notice} role="alert">
						{notice}
					</p>
				)}
				<header className={styles.header}>
					<h1>Directory</h1>
					<p className={styles.subtitle}>
						{filtered
							? `${data.total} ${data.total === 1 ? "developer matches" : "developers match"} your filters`
							: `${data.total} ${data.total === 1 ? "developer" : "developers"} building in public`}
					</p>
				</header>
				<DirectoryControls
					key={`${params.search ?? ""}|${params.stack ?? ""}|${params.sort ?? ""}`}
					initialSearch={params.search || ""}
					initialStack={params.stack || ""}
					initialSort={params.sort || "newest"}
				/>

				{data.results.length === 0 ? (
					<div className={styles.empty}>
						<p className={styles.emptyTitle}>
							{filtered ? "No profiles match those filters." : "No profiles yet."}
						</p>
						<p>
							{filtered
								? "Try a different name or stack."
								: "Log in with GitHub to be the first."}
						</p>
						<Link
							href={filtered ? "/directory" : "/directory?login=1"}
							className={styles.emptyAction}
						>
							{filtered ? "Clear filters" : "Log in with GitHub"}
						</Link>
					</div>
				) : (
					<ul className={styles.grid}>
						{data.results.map((card) => (
							<li key={card.username}>
								<Link href={`/${card.username}`} className={styles.card}>
									<div
										className={styles.banner}
										style={bannerStyle(card.username)}
										aria-hidden="true"
									/>
									<Image
										src={card.avatar_url || "/default-avatar.png"}
										alt=""
										width={56}
										height={56}
										className={styles.cardAvatar}
									/>
									<div className={styles.cardBody}>
										<p className={styles.displayName}>
											{card.display_name || card.username}
										</p>
										<p className={styles.username}>@{card.username}</p>
										{card.bio && (
											<p className={styles.bio}>{bioPreview(card.bio)}</p>
										)}
										{card.stack_tags.length > 0 && (
											<div className={styles.tagRow}>
												{card.stack_tags.slice(0, 4).map((t) => (
													<span key={t} className={styles.tag}>
														{t}
													</span>
												))}
											</div>
										)}
									</div>
									<div className={styles.cardFooter}>
										{card.contributions !== null && (
											<span>{card.contributions} contributions</span>
										)}
										{card.hint && (
											<span className={styles.hint}>
												{HINT_PREFIX[card.hint.type]}: {card.hint.name}
											</span>
										)}
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}

				{data.total_pages > 1 && (
					<nav className={styles.pagination} aria-label="Pagination">
						{data.page > 1 && (
							<Link href={pageHref(data.page - 1)} className={styles.pageLink} aria-label="Previous page">
								←
							</Link>
						)}
						{pageWindow(data.page, data.total_pages).map((p, i) =>
							p === "…" ? (
								<span key={`gap-${i}`} className={styles.pageGap} aria-hidden="true">
									…
								</span>
							) : (
								<Link
									key={p}
									href={pageHref(p)}
									className={`${styles.pageLink} ${p === data.page ? styles.pageActive : ""}`}
									aria-current={p === data.page ? "page" : undefined}
								>
									{p}
								</Link>
							),
						)}
						{data.page < data.total_pages && (
							<Link href={pageHref(data.page + 1)} className={styles.pageLink} aria-label="Next page">
								→
							</Link>
						)}
					</nav>
				)}
			</div>
			<SiteFooter />
			{params.login === "1" && <LoginModal />}
		</main>
	);
}
