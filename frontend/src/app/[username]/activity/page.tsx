import ActivityCards from "@/app/components/ActivityCards";
import SubpageHeader from "@/app/components/SubpageHeader";
import { loadProfile } from "@/lib/profile-api";

export default async function ActivityPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);

	return (
		<>
			<SubpageHeader username={profile.username} title="Activity" />
			<ActivityCards profile={profile} mode="page" />
		</>
	);
}
