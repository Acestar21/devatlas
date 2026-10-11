import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SiteTopBar from "@/app/components/SiteTopBar";
import { ONBOARDED_COOKIE, isProfileBlank } from "@/lib/onboarding";
import { fetchViewer } from "@/lib/server-context";
import Onboarding from "./Onboarding";
import styles from "./welcome.module.css";

export const metadata = { title: "Welcome to DevAtlas" };

/**
 * Landing page right after GitHub login. Optional by design: it only shows when the profile is
 * still blank AND the user hasn't skipped it before; everyone else passes straight through.
 *
 */
export default async function WelcomePage({
	searchParams,
}: {
	searchParams: Promise<{ setup?: string }>;
}) {
	const { setup } = await searchParams;
	const viewer = await fetchViewer();
	if (!viewer) redirect("/directory?login=1");

	// Entry check, once: skipped/finished before or already filled in -> straight to the directory.
	// Otherwise mark the session with ?setup=1. Adding a tag refreshes the page and makes the profile
	// non-blank, so the flag is what keeps people inside the flow. Visiting /welcome?setup=1 yourself
	// re-runs setup any time.
	if (setup !== "1") {
		const done = (await cookies()).get(ONBOARDED_COOKIE)?.value === "1";
		if (done || !isProfileBlank(viewer)) redirect("/directory");
		redirect("/welcome?setup=1");
	}

	return (
		<main className={styles.page}>
			<SiteTopBar />
			<Onboarding
				username={viewer.username}
				displayName={viewer.display_name || viewer.username}
				avatarUrl={viewer.avatar_url}
			/>
		</main>
	);
}
