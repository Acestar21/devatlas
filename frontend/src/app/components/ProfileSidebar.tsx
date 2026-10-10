import Image from "next/image";
import { Profile } from "@/types";
import BioText from "./BioText";
import { SettingsGear } from "./SettingsProvider";
import TagList from "./TagList";
import styles from "./ProfileSidebar.module.css";

export default function ProfileSidebar({
	profile,
	banner = null,
}: {
	profile: Profile;
	/** devatlas/banner.* from the <user>/<user> repo, already probed on the server; null = solid fallback */
	banner?: string | null;
}) {
	const interests = profile.interests ?? [];
	const interestsMuted = profile.section_visibility?.interests === false;

	return (
		<div className={styles.card}>
			<div
				className={banner ? styles.banner : `${styles.banner} ${styles.solid}`}
				aria-hidden={banner ? undefined : true}
			>
				{banner && (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={banner} alt="" className={styles.bannerImage} />
				)}
				<SettingsGear section="profile" label="Profile settings" className={styles.cornerGear} />
			</div>
			<div className={styles.head}>
				<Image
					src={profile.avatar_url || "/default-avatar.png"}
					alt={profile.display_name || profile.username}
					width={88}
					height={88}
					loading="eager"
					className={styles.avatar}
				/>
				<div className={styles.identity}>
					<h1>{profile.display_name || profile.username}</h1>
					<p>@{profile.username}</p>
				</div>
			</div>

			{profile.bio && (
				<BioText text={profile.bio} className={styles.bio} />
			)}

			<section className={`${styles.section} ${styles.hideMobile}`}>
				<div className={styles.sectionHead}>
					<h2>Stack</h2>
					<SettingsGear section="profile" label="Edit stack" />
				</div>
				{profile.stack_tags.length ? (
					<TagList tags={profile.stack_tags.map((t) => t.name)} />
				) : (
					<p className={styles.empty}>No stack added yet.</p>
				)}
			</section>

			{(interests.length > 0 || profile.is_owner) &&
				profile.interests !== null && (
					<section
						className={`${styles.section} ${styles.hideMobile} ${interestsMuted ? styles.muted : ""}`}
					>
						<div className={styles.sectionHead}>
							<h2>Interests</h2>
							<SettingsGear section="interests" label="Edit interests" />
						</div>
						{interests.length ? (
							<TagList tags={interests.map((t) => t.name)} />
						) : (
							<p className={styles.empty}>Nothing added yet.</p>
						)}
					</section>
				)}

			{(profile.content_links.length > 0 || profile.is_owner) && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<h2>Links</h2>
						<SettingsGear section="links" label="Edit links" />
					</div>
					{profile.content_links.length ? (
						<ul className={styles.links}>
							{profile.content_links.map((link, i) => (
								<li key={`${link.url}-${i}`}>
									<a
										href={link.url}
										target="_blank"
										rel="noreferrer"
									>
										{link.label} <span aria-hidden="true">↗</span>
									</a>
								</li>
							))}
						</ul>
					) : (
						<p className={styles.empty}>No links yet.</p>
					)}
				</section>
			)}

		</div>
	);
}
