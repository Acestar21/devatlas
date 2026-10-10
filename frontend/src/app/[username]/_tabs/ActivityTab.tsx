import Card from "@/app/components/Card";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import PostCard from "@/app/components/PostCard";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import { cardMuted, cardShown, sectionVisibility } from "@/lib/visibility";
import { Profile } from "@/types";
import styles from "./tabs.module.css";

const shortDate = (iso: string) =>
	new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });

export default function ActivityTab({ profile }: { profile: Profile }) {
	const vis = sectionVisibility(profile);
	const base = `/${profile.username}`;
	const stats = profile.stats;

	const showLc = profile.leetcode !== null || profile.is_owner;
	const lcMuted =
		!vis.leetcode || cardMuted(profile, "activity", "leetcode");

	const feed =
		stats &&
		(vis.github || profile.is_owner) &&
		cardShown(profile, "github", "activity")
			? (stats.activity ?? []).slice(0, 5)
			: [];

	const posts = [...(profile.posts ?? [])]
		.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
		.slice(0, 3);
	const showPosts = profile.posts !== null && (posts.length > 0 || profile.is_owner);

	if (!showLc && !feed.length && !showPosts) {
		return (
			<Card title="Activity">
				<p className={styles.empty}>Nothing here yet.</p>
			</Card>
		);
	}

	return (
		<div className={styles.stack}>
			{showLc && (
				<Card
					title="LeetCode"
					muted={lcMuted}
					span={!feed.length}
					action={
						profile.is_owner ? (
							<ProfileEditButton profile={profile} section="leetcode" />
						) : undefined
					}
				>
					{profile.leetcode ? (
						<LeetcodeCard lc={profile.leetcode} />
					) : (
						<p className={styles.empty}>Add your solved counts.</p>
					)}
				</Card>
			)}
			{feed.length > 0 && (
				<Card
					title="Recent GitHub activity"
					href={`${base}/github`}
					hrefLabel="More"
					span={!showLc}
				>
					<ul className={styles.feed}>
						{feed.map((item, i) => (
							<li key={i}>
								<a
									className={styles.feedItem}
									href={item.url}
									target="_blank"
									rel="noreferrer"
								>
									<span>
										<strong>{item.repo}</strong> · {item.text}
									</span>
									<span className={styles.feedDate}>
										{shortDate(item.at)}
									</span>
								</a>
							</li>
						))}
					</ul>
				</Card>
			)}
			{showPosts && (
				<Card
					title="Writing"
					href={`${base}/activity`}
					muted={cardMuted(profile, "activity", "posts")}
					span
				>
					{posts.length ? (
						<div className={styles.posts}>
							{posts.map((post, i) => (
								<PostCard key={`${post.url}-${i}`} post={post} />
							))}
						</div>
					) : (
						<p className={styles.empty}>No posts added yet.</p>
					)}
				</Card>
			)}
		</div>
	);
}
