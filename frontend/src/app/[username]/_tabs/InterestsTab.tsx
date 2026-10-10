import Card from "@/app/components/Card";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import TagList from "@/app/components/TagList";
import { Profile } from "@/types";
import styles from "./tabs.module.css";

export default function InterestsTab({ profile }: { profile: Profile }) {
	const interests = profile.interests ?? [];
	const muted = profile.section_visibility?.interests === false;
	return (
		<div className={styles.single}>
			{profile.interests !== null && (
				<Card
					title="Interests"
					href={`/${profile.username}/interests`}
					muted={muted}
					action={<ProfileEditButton section="interests" />}
				>
					{interests.length ? (
						<TagList tags={interests.map((t) => t.name)} limit={24} />
					) : (
						<p className={styles.empty}>
							{profile.is_owner
								? "No interests yet. Use the gear to add some."
								: "Nothing here yet."}
						</p>
					)}
				</Card>
			)}
			<Card title="Stack">
				{profile.stack_tags.length ? (
					<TagList tags={profile.stack_tags.map((t) => t.name)} limit={24} />
				) : (
					<p className={styles.empty}>No stack added yet.</p>
				)}
			</Card>
		</div>
	);
}
