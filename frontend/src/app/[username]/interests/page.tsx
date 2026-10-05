import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Profile } from "@/types";
import { loadProfile } from "@/lib/profile-api";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";
import styles from "./page.module.css";

export default async function InterestsPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username)
	
	if (profile.section_visibility?.interests === false && !profile.is_owner)
		notFound();

	const interests = profile.interests ?? [];
	const muted = profile.section_visibility?.interests === false;

	return (
		<SectionPlaceholder profile={profile} title="Interests">
			<section
				className={`${styles.card}${muted ? ` ${styles.muted}` : ""}`}
			>
				<p className={styles.label}>Interests</p>
				{interests.length ? (
					<div className={styles.chips}>
						{interests.map((interest) => (
							<span key={interest.id}>{interest.name}</span>
						))}
					</div>
				) : (
					<p className={styles.empty}>
						{profile.is_owner
							? "No interests yet — use Edit settings to add some."
							: "Nothing here yet."}
					</p>
				)}
			</section>
		</SectionPlaceholder>
	);
}
