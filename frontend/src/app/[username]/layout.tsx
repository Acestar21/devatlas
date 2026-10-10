import BadgeEmbed from "@/app/components/BadgeEmbed";
import ModerationBanner from "@/app/components/ModerationBanner";
import ProfileNav from "@/app/components/ProfileNav";
import ProfileSidebar from "@/app/components/ProfileSidebar";
import ProfileTopBar from "@/app/components/ProfileTopBar";
import { SettingsProvider } from "@/app/components/SettingsProvider";
import SiteFooter from "@/app/components/SiteFooter";
import { findProfileBanner } from "@/lib/banners";
import { loadProfile } from "@/lib/profile-api";
import { fetchViewer, getThemeCookie } from "@/lib/server-context";
import styles from "./layout.module.css";

/**
 * Shared shell for the profile and all of its subpages: sticky top bar, notch nav fixed to the
 * left screen edge, sticky profile card, and a scrolling content column. Pages only render the
 * right column. The settings modal is mounted ONCE here (SettingsProvider) so no card, menu or
 * click-outside handler can unmount it while the owner is typing.
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
	const banner = await findProfileBanner(profile.username);

	return (
		<SettingsProvider profile={profile}>
			<div className={styles.shell}>
				<ProfileTopBar viewer={viewer} theme={themeCookie || profile.theme} />
				<ProfileNav profile={profile} />
				<div className={styles.grid}>
					<aside className={styles.side} aria-label="Profile">
						<ProfileSidebar profile={profile} banner={banner} />
					</aside>
					<main className={styles.main}>
						<ModerationBanner profile={profile} />
						{children}
					</main>
				</div>
				{/* Only the profile's owner sees the badge; everyone else gets the plain footer. */}
				<SiteFooter badge={profile.is_owner ? <BadgeEmbed username={profile.username} /> : undefined} />
			</div>
		</SettingsProvider>
	);
}
