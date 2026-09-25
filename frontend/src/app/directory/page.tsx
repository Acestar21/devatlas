import { DirectoryResponse } from "@/types-directory";
import Link from "next/link";
import Image from "next/image";
import DirectoryControls from "./DirectoryControls";
import LoginModal from "@/app/components/LoginModal";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import styles from "./page.module.css";
import { getSessionCookieValue, getThemeCookie, sessionHeaders } from "@/lib/server-context";

async function getCurrentUser(): Promise<{ username: string; avatar_url: string | null } | null> {
	try {
		const sessionCookie = await getSessionCookieValue();
		if (!sessionCookie) return null;

		const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
			cache: "no-store",
			headers: sessionHeaders(sessionCookie),
		});
		if (!res.ok) return null;
		const data = await res.json();
		return { username: data.username, avatar_url: data.avatar_url };
	} catch {
		return null;
	}
}

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

	const res = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/directory?${qs.toString()}`,
		{
			cache: "no-store",
		},
	);
	return res.json();
}

const HINT_PREFIX: Record<string, string> = {
	game: "Also plays",
	interest: "Into",
};

function bioPreview(value: string, limit = 112): string {
	if (value.length <= limit) return value;
	const shortened = value.slice(0, limit - 3).trimEnd();
	const lastSpace = shortened.lastIndexOf(" ");
	return `${shortened.slice(0, lastSpace > 60 ? lastSpace : shortened.length)}...`;
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
	}>;
}) {
	const params = await searchParams;
	const data = await fetchDirectory(params);
	const user = await getCurrentUser();
	const themeCookie = await getThemeCookie();

	return (
		<main className={styles.page}>
			<div className={styles.topBar}>
				<div className={styles.topBarInner}><div><Link href="/" className={styles.brand}>DevAtlas</Link></div>
				<div className={styles.topActions}><ThemeSwitcher initialTheme={themeCookie || "terminal"} /><Link href="/directory" className={styles.topLink}>/Directory</Link>{user ? <Link href={`/${user.username}`} aria-label="Open your profile"><Image src={user.avatar_url || "/default-avatar.png"} alt="Your profile" width={40} height={40} loading="eager" className={styles.headerAvatar} /></Link> : <Link href="/directory?login=1" className={styles.topLink}>/login</Link>}</div></div>
			</div>
			<div className={styles.container}>
				<DirectoryControls
					initialSearch={params.search || ""}
					initialStack={params.stack || ""}
					initialSort={params.sort || "newest"}
				/>

				{data.results.length === 0 ? (
					<p className={styles.empty}>No profiles match yet.</p>
				) : (
					<div className={styles.grid}>
						{data.results.map((card) => (
							<a
								key={card.username}
								href={`/${card.username}`}
								className={styles.card}
							>
								<div className={styles.cardHeader}>
									<Image
										src={card.avatar_url || "/default-avatar.png"}
										alt={card.username}
										width="46"
										height="46"
										className={styles.cardAvatar}
									/>
									<div>
										<p className={styles.displayName}>
											{card.display_name || card.username}
										</p>
										<p className={styles.username}>
											@{card.username}
										</p>
									</div>
								</div>

								{card.bio && (
									<p className={styles.bio}>{bioPreview(card.bio)}</p>
								)}

								{card.stack_tags.length > 0 && (
									<div className={styles.tagRow}>
										{card.stack_tags
											.slice(0, 4)
											.map((t) => (
												<span
													key={t}
													className={styles.tag}
												>
													{t}
												</span>
											))}
									</div>
								)}

								<div className={styles.cardFooter}>
									{card.contributions !== null && (
										<span className={styles.contributions}>
											{card.contributions} contributions
										</span>
									)}
									{card.hint && (
										<span className={styles.hint}>
											{HINT_PREFIX[card.hint.type]}:{" "}
											{card.hint.name}
										</span>
									)}
								</div>
							</a>
						))}
					</div>
				)}

				{data.total_pages > 1 && (
					<div className={styles.pagination}>
						{Array.from(
							{ length: data.total_pages },
							(_, i) => i + 1,
						).map((p) => (
							<a
								key={p}
								href={`?${new URLSearchParams({ ...params, page: String(p) } as Record<string, string>).toString()}`}
								className={`${styles.pageLink} ${p === data.page ? styles.pageActive : ""}`}
							>
								{p}
							</a>
						))}
					</div>
				)}
			</div>
			{params.login === "1" && <LoginModal />}
		</main>
	);
}
