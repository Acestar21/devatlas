import { Profile } from "@/types";
import ProfileNav from "./ProfileNav";
import AppShell from "./AppShell";
import styles from "./SectionPlaceholder.module.css";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";

export default async function SectionPlaceholder({
	profile,
	title,
	children,
}: {
	profile: Profile;
	title: string;
	children?: React.ReactNode;
}) {
	const activeSection = title.toLowerCase();
	const themeCookie = await getThemeCookie();
	const viewer = profile.is_owner ? profile : await fetchViewer();
	return (
		<AppShell
			viewer={
				viewer
					? { username: viewer.username, avatar_url: viewer.avatar_url }
					: null
			}
			initialTheme={themeCookie || profile.theme}
			showDisclaimer
		>
			<main className={styles.page}>
			<div className={styles.layout}>
				<ProfileNav
					username={profile.username}
					showGithub={profile.stats !== null}
					visibility={profile.section_visibility || undefined}
					profile={profile}
					activeSection={activeSection}
				/>
				{children ? (
					<div className={styles.content}>{children}</div>
				) : (
					<section className={styles.panel}>
						<p className={styles.eyebrow}>{title}</p>
						<h1>{title}</h1>
						<p>Coming Soon</p>
					</section>
				)}
			</div>
			</main>
		</AppShell>
	);
}
