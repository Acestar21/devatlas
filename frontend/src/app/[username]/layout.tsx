import ModerationBanner from "@/app/components/ModerationBanner";
import ProfileNav from "@/app/components/ProfileNav";
import ProfileSidebar from "@/app/components/ProfileSidebar";
import ProfileTopBar from "@/app/components/ProfileTopBar";
import SiteFooter from "@/app/components/SiteFooter";
import { loadProfile } from "@/lib/profile-api";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";
import styles from "./layout.module.css";

/**
 * Shared shell for the profile and all of its subpages: sticky top bar, icon rail, sticky profile
 * card on the left, and a scrolling content column on the right. Pages only render the right column.
 */
export default async function ProfileLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const [profile, viewer, themeCookie] = await Promise.all([
		loadProfile(username),
		fetchViewer(),
		getThemeCookie(),
	]);

	return (
		<div className={styles.shell}>
			<ProfileTopBar viewer={viewer} theme={themeCookie || profile.theme} />
			<div className={styles.grid}>
				<ProfileNav profile={profile} />
				<aside className={styles.side} aria-label="Profile">
					<ProfileSidebar profile={profile} />
				</aside>
				<main className={styles.main}>
					<ModerationBanner profile={profile} />
					{children}
				</main>
			</div>
			<SiteFooter />
		</div>
	);
}
