import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/backend";
import { MfaStatus } from "@/types-mod";
import MfaPanel from "./MfaPanel";

export const metadata = {
	title: "Moderator sign-in · DevAtlas",
	robots: { index: false, follow: false },
};

export default async function MfaPage() {
	const response = await backendFetch("mfa/status");
	if (!response.ok) notFound(); // logged out (401) or not staff (404): the page doesn't exist for them
	const status = (await response.json()) as MfaStatus;
	return <MfaPanel status={status} />;
}
