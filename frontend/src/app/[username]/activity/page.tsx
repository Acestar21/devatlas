import Card from "@/app/components/Card";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import PostCard from "@/app/components/PostCard";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import SubpageHeader from "@/app/components/SubpageHeader";
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
		<>
			<SubpageHeader username={profile.username} title="Activity" />
			{/* one grid row: both cards stretch to the same height */}
			<div className={showLc && showPosts ? styles.pair : styles.single}>
				{showLc && (
					<Card title="LeetCode" muted={lcMuted} action={<ProfileEditButton section="leetcode" />}>
						{profile.leetcode ? (
							<LeetcodeCard lc={profile.leetcode} />
						) : (
							<p className={styles.empty}>No LeetCode stats added yet.</p>
						)}
					</Card>
				)}
				{showPosts && (
					<Card title="Writing" muted={postsMuted} action={<ProfileEditButton section="activity" />}>
						{sortedPosts.length ? (
							<div className={styles.postList}>
								{sortedPosts.map((post, i) => (
									<PostCard key={`${post.url}-${i}`} post={post} />
								))}
							</div>
						) : (
							<p className={styles.empty}>No posts added yet.</p>
						)}
					</Card>
				)}
			</div>
			{!showLc && !showPosts && <p className={styles.empty}>Nothing here yet.</p>}
		</>
	);
}
