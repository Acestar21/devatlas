import Card from "@/app/components/Card";
import CurrentlyCard from "@/app/components/CurrentlyCard";
import JournalCard from "@/app/components/JournalCard";
import LeetcodeCard from "@/app/components/LeetcodeCard";
import PostCard from "@/app/components/PostCard";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import styles from "@/app/[username]/_tabs/tabs.module.css";
import { cardMuted, cardShown, sectionVisibility } from "@/lib/visibility";
import { Profile } from "@/types";

/**
 * What the developer is doing LATELY: journal, currently-into, LeetCode, writing.
 * Shared by the profile's Activity tab (mode="tab", short) and the Activity subpage
 * (mode="page", full) so both always agree. GitHub numbers deliberately live only on the
 * GitHub page; nothing here repeats them.
 */
export default function ActivityCards({
	profile,
	mode,
}: {
	profile: Profile;
	mode: "tab" | "page";
}) {
	const vis = sectionVisibility(profile);
	const owner = profile.is_owner;
	const base = `/${profile.username}`;

	const journal = profile.journal ?? [];
	const showJournal = owner || journal.length > 0;

	const currently = profile.currently ?? [];
	const showCurrently = cardShown(profile, "activity", "currently") && (owner || currently.length > 0);

	const showLc = (profile.leetcode !== null || owner) && (vis.leetcode || owner);
	const lcMuted = !vis.leetcode || cardMuted(profile, "activity", "leetcode");

	const allPosts = [...(profile.posts ?? [])].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
	const posts = mode === "tab" ? allPosts.slice(0, 3) : allPosts;
	const showPosts = profile.posts !== null && (allPosts.length > 0 || owner);

	if (!showJournal && !showCurrently && !showLc && !showPosts) {
		return (
			<Card title="Activity">
				<p className={styles.empty}>Nothing here yet.</p>
			</Card>
		);
	}

	// currently + LeetCode share a row; if only one exists it takes the full width
	const pairAlone = !(showCurrently && showLc);

	return (
		<div className={styles.stack}>
			{showJournal && (
				<Card title="Journal" href="/journal" hrefLabel="Everyone's journal" span>
					<JournalCard entries={journal} isOwner={owner} />
				</Card>
			)}
			{showCurrently && (
				<Card
					title="Currently into"
					action={<ProfileEditButton section="currently" />}
					muted={cardMuted(profile, "activity", "currently")}
					span={pairAlone}
				>
					<CurrentlyCard items={currently} isOwner={owner} />
				</Card>
			)}
			{showLc && (
				<Card
					title="LeetCode"
					muted={lcMuted}
					action={<ProfileEditButton section="leetcode" />}
					span={pairAlone}
				>
					{profile.leetcode ? (
						<LeetcodeCard lc={profile.leetcode} />
					) : (
						<p className={styles.empty}>Add your solved counts.</p>
					)}
				</Card>
			)}
			{showPosts && (
				<Card
					title="Writing"
					href={mode === "tab" ? `${base}/activity` : undefined}
					muted={cardMuted(profile, "activity", "posts")}
					action={<ProfileEditButton section="activity" />}
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
