import ProfileTabs, { TabDef } from "@/app/components/ProfileTabs";
import { computeInCommon } from "@/lib/in-common";
import { loadProfile } from "@/lib/profile-api";
import { fetchViewer } from "@/lib/server-context";
import ActivityTab from "./_tabs/ActivityTab";
import InCommonTab from "./_tabs/InCommonTab";
import InterestsTab from "./_tabs/InterestsTab";
import OverviewTab from "./_tabs/OverviewTab";

export default async function ProfilePage({
	params,
	searchParams,
}: {
	params: Promise<{ username: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const [{ username }, { tab }] = await Promise.all([params, searchParams]);
	const [profile, viewer] = await Promise.all([loadProfile(username), fetchViewer()]);

	const tabs: TabDef[] = [
		{ id: "overview", label: "Overview", content: <OverviewTab profile={profile} /> },
		{ id: "activity", label: "Activity", content: <ActivityTab profile={profile} /> },
		{ id: "interests", label: "Interests", content: <InterestsTab profile={profile} /> },
	];
	if (!profile.is_owner) {
		tabs.push({
			id: "in-common",
			label: "In common",
			badge: viewer ? computeInCommon(profile, viewer).total : undefined,
			content: <InCommonTab profile={profile} viewer={viewer} />,
		});
	}

	return <ProfileTabs tabs={tabs} initial={tab} />;
}
