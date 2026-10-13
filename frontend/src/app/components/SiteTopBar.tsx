import { fetchViewerSummary, getThemeCookie } from "@/lib/server-context";
import ProfileTopBar from "./ProfileTopBar";

/**
 * The one top bar for every page outside a profile (directory, about, privacy, 404...).
 * It looks the viewer + theme up itself so pages just drop it in. Profile pages already have
 * both in hand and render ProfileTopBar directly, so the bar is identical everywhere.
 */
export default async function SiteTopBar({ active }: { active?: "directory" | "journal" }) {
	const [viewer, theme] = await Promise.all([
		fetchViewerSummary(),
		getThemeCookie(),
	]);
	return <ProfileTopBar viewer={viewer} theme={theme || "terminal"} active={active} />;
}
