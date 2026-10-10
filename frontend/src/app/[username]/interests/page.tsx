import { notFound } from "next/navigation";
import Card from "@/app/components/Card";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import SubpageHeader from "@/app/components/SubpageHeader";
import { loadProfile } from "@/lib/profile-api";
import styles from "./page.module.css";

export default async function InterestsPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);

	if (profile.section_visibility?.interests === false && !profile.is_owner) notFound();

	const interests = profile.interests ?? [];
	const muted = profile.section_visibility?.interests === false;

	return (
		<>
			<SubpageHeader username={profile.username} title="Interests" />
			<Card title="Interests" muted={muted} action={<ProfileEditButton section="interests" />}>
				{interests.length ? (
					<div className={styles.chips}>
						{interests.map((interest) => (
							<span key={interest.id}>{interest.name}</span>
						))}
					</div>
				) : (
					<p className={styles.empty}>
						{profile.is_owner ? "No interests yet. Use the gear to add some." : "Nothing here yet."}
					</p>
				)}
			</Card>
		</>
	);
}
