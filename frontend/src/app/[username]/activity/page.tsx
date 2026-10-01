import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Profile } from "@/types";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import styles from "./page.module.css";

export default async function ActivityPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const cookie = (await cookies()).get("devcard_session");
	const response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL}/profiles/${username}`,
		{
			cache: "no-store",
			headers: cookie
				? { Cookie: `devcard_session=${cookie.value}` }
				: {},
		},
	);
	if (response.status === 404) notFound();
	if (!response.ok) return null;
	const profile = (await response.json()) as Profile;

	const cv = profile.card_visibility?.activity ?? {};
	const showLc = profile.leetcode !== null || profile.is_owner;
	const lcMuted =
		(cv.leetcode ?? true) === false ||
		profile.section_visibility?.leetcode === false;
	const showPosts = Boolean(profile.posts?.length) || profile.is_owner;
	const postsMuted = (cv.posts ?? true) === false;

	return (
		<SectionPlaceholder profile={profile} title="Activity">
			{showLc && (
				<section
					className={`${styles.card}${lcMuted ? ` ${styles.muted}` : ""}`}
				>
					<p className={styles.label}>LeetCode</p>
					{profile.leetcode ? (
						<LeetcodeCard lc={profile.leetcode} />
					) : (
						<p className={styles.empty}>
							No LeetCode stats added yet.
						</p>
					)}
				</section>
			)}
			{showPosts && (
				<section
					className={`${styles.card}${postsMuted ? ` ${styles.muted}` : ""}`}
				>
					<p className={styles.label}>Writing</p>
					{profile.posts?.length ? (
						<ul className={styles.posts}>
							{profile.posts.map((post, i) => (
								<li key={i}>
									<a
										href={post.url}
										target="_blank"
										rel="noreferrer"
									>
										{post.title} ↗
									</a>
								</li>
							))}
						</ul>
					) : (
						<p className={styles.empty}>No posts added yet.</p>
					)}
				</section>
			)}
			{!showLc && !showPosts && (
				<p className={styles.empty}>Nothing here yet.</p>
			)}
		</SectionPlaceholder>
	);
}
