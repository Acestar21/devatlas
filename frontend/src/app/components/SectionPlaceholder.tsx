import { Profile } from "@/types";
import ProfileFrame from "./ProfileFrame";
import styles from "./SectionPlaceholder.module.css";

/** Sub-page wrapper (Activity, Games, Interests). Chrome now lives in ProfileFrame. */
export default function SectionPlaceholder({
	profile,
	title,
	children,
}: {
	profile: Profile;
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<ProfileFrame profile={profile} active={title.toLowerCase()}>
			{children ? (
				<div className={styles.content}>{children}</div>
			) : (
				<section className={styles.panel}>
					<p className={styles.eyebrow}>{title}</p>
					<h1>{title}</h1>
					<p>Coming Soon</p>
				</section>
			)}
		</ProfileFrame>
	);
}
