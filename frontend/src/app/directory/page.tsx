import { DirectoryResponse } from "@/types-directory";
import DirectoryControls from "./DirectoryControls";
import styles from "./page.module.css";

async function getCurrentUser(): Promise<{ username: string } | null> {
	try {
		const { cookies } = await import("next/headers");
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get("devcard_session");
		if (!sessionCookie) return null;

		const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
			cache: "no-store",
			headers: { Cookie: `devcard_session=${sessionCookie.value}` },
		});
		if (!res.ok) return null;
		const data = await res.json();
		return { username: data.username };
	} catch {
		return null;
	}
}

async function fetchDirectory(params: {
	search?: string;
	stack?: string;
	sort?: string;
	page?: string;
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

export default async function DirectoryPage({
	searchParams,
}: {
	searchParams: Promise<{
		search?: string;
		stack?: string;
		sort?: string;
		page?: string;
	}>;
}) {
	const params = await searchParams;
	const data = await fetchDirectory(params);
	const user = await getCurrentUser();

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<div className={styles.topBar}>
					<div>
						<h1 className={styles.title}>Directory</h1>
						<p className={styles.subtitle}>People worth knowing.</p>
					</div>
					<a href={user ? `/${user.username}` : "/"} className={styles.cornerLink}>
						{user ? "Go to your profile" : "Log in"}
					</a>
				</div>

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
									<img
										src={
											card.avatar_url ||
											"/default-avatar.png"
										}
										alt={card.username}
										className={styles.avatar}
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
									<p className={styles.bio}>{card.bio}</p>
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
		</main>
	);
}
