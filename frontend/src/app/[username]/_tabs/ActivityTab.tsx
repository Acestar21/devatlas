import ActivityCards from "@/app/components/ActivityCards";
import { Profile } from "@/types";

export default function ActivityTab({ profile }: { profile: Profile }) {
	return <ActivityCards profile={profile} mode="tab" />;
}
