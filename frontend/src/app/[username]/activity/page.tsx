import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/backend";
import { Profile } from "@/types";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import PostCard from "@/app/components/PostCard";
import styles from "./page.module.css";

export default async function ActivityPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const response = await backendFetch(`profiles/${encodeURIComponent(username)}`);
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
	const sortedPosts = [...(profile.posts ?? [])].sort((a, b) =>
		(b.date ?? "").localeCompare(a.date ?? ""),
	);

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
					{sortedPosts.length ? (
						<div className={styles.postList}>
							{sortedPosts.map((post, i) => (
								<PostCard
									key={`${post.url}-${i}`}
									post={post}
								/>
							))}
						</div>
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
