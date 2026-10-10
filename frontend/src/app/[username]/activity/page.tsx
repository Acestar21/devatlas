import LeetcodeCard from "@/app/components/LeetcodeCard";
import Panel from "@/app/components/Panel";
import PostCard from "@/app/components/PostCard";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";
import { loadProfile } from "@/lib/profile-api";
import styles from "./page.module.css";

export default async function ActivityPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);

	const cv = profile.card_visibility?.activity ?? {};
	const showLc = profile.leetcode !== null || profile.is_owner;
	const lcMuted = (cv.leetcode ?? true) === false || profile.section_visibility?.leetcode === false;
	const showPosts = Boolean(profile.posts?.length) || profile.is_owner;
	const postsMuted = (cv.posts ?? true) === false;
	const sortedPosts = [...(profile.posts ?? [])].sort((a, b) =>
		(b.date ?? "").localeCompare(a.date ?? ""),
	);

	return (
		<SectionPlaceholder profile={profile} title="Activity">
			{/* one grid row: both cards stretch to the same height */}
			<div className={showLc && showPosts ? styles.pair : styles.single}>
				{showLc && (
					<Panel label="LeetCode" gearSection="leetcode" gearLabel="Edit LeetCode stats" muted={lcMuted}>
						{profile.leetcode ? (
							<LeetcodeCard lc={profile.leetcode} />
						) : (
							<p className={styles.empty}>No LeetCode stats added yet.</p>
						)}
					</Panel>
				)}
				{showPosts && (
					<Panel label="Writing" gearSection="activity" gearLabel="Edit writing settings" muted={postsMuted}>
						{sortedPosts.length ? (
							<div className={styles.postList}>
								{sortedPosts.map((post, i) => (
									<PostCard key={`${post.url}-${i}`} post={post} />
								))}
							</div>
						) : (
							<p className={styles.empty}>No posts added yet.</p>
						)}
					</Panel>
				)}
			</div>
			{!showLc && !showPosts && <p className={styles.empty}>Nothing here yet.</p>}
		</SectionPlaceholder>
	);
}
