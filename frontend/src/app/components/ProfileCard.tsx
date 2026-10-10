import Image from "next/image";
import { Profile } from "@/types";
import BioText from "./BioText";
import ExpandableTags from "./ExpandableTags";
import { SettingsGear } from "./SettingsProvider";
import styles from "./ProfileCard.module.css";

/**
 * Left identity card (stack, interests, links).
 * `banner` is the already-probed devatlas/banner.* URL of <user>/<user>, or null.
 * With an image the banner is taller; the solid fallback is deliberately shorter.
 */
export default function ProfileCard({ profile, banner }: { profile: Profile; banner: string | null }) {
	const interests = profile.interests ?? [];
	const showInterests =
		profile.interests !== null && (interests.length > 0 || profile.is_owner);
	const showLinks = profile.content_links.length > 0 || profile.is_owner;
	const interestsMuted = profile.section_visibility?.interests === false;

	return (
		<aside className={styles.card}>
			<div className={banner ? styles.banner : `${styles.banner} ${styles.solid}`}>
				{banner && (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={banner} alt="" className={styles.bannerImage} />
				)}
				{profile.is_owner && (
					<SettingsGear
						section="profile"
						label="Profile settings"
						className={styles.cornerGear}
					/>
				)}
			</div>

			<div className={styles.identityRow}>
				<Image
					src={profile.avatar_url || "/default-avatar.png"}
					alt={profile.display_name || profile.username}
					width={88}
					height={88}
					loading="eager"
					className={styles.avatar}
				/>
			</div>
			<div className={styles.identity}>
				<h1>{profile.display_name || profile.username}</h1>
				<p>@{profile.username}</p>
			</div>

			{(profile.bio || profile.is_owner) && (
				<div className={styles.bioBox}>
					{profile.bio ? (
						<BioText text={profile.bio} className={styles.bio} />
					) : (
						<span className={styles.placeholder}>Add a short bio in settings.</span>
					)}
				</div>
			)}

			<section className={styles.section}>
				<div className={styles.sectionHead}>
					<h2>Stack</h2>
					<SettingsGear section="profile" label="Edit stack" />
				</div>
				{profile.stack_tags.length > 0 ? (
					<ExpandableTags tags={profile.stack_tags.map((t) => t.name)} />
				) : (
					<p className={styles.muted}>Nothing added yet.</p>
				)}
			</section>

			{showInterests && (
				<section className={`${styles.section} ${interestsMuted ? styles.dim : ""}`}>
					<div className={styles.sectionHead}>
						<h2>Interests</h2>
						<SettingsGear section="interests" label="Edit interests" />
					</div>
					{interests.length > 0 ? (
						<ExpandableTags tags={interests.map((t) => t.name)} limit={6} />
					) : (
						<p className={styles.muted}>Nothing added yet.</p>
					)}
				</section>
			)}

			{showLinks && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<h2>Links</h2>
						<SettingsGear section="links" label="Edit links" />
					</div>
					{profile.content_links.length > 0 ? (
						<div className={styles.tags}>
							{profile.content_links.map((link, i) => (
								<a
									key={`${link.url}-${i}`}
									href={link.url}
									target="_blank"
									rel="noreferrer"
									className={styles.link}
								>
									{link.label} ↗
								</a>
							))}
						</div>
					) : (
						<p className={styles.muted}>No links yet.</p>
					)}
				</section>
			)}
		</aside>
	);
}
