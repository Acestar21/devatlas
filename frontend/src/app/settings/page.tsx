import { redirect } from "next/navigation";
import { Profile } from "@/types";
import SettingsForm from "./SettingsForm";
import { getSessionCookieValue, sessionHeaders } from "@/lib/server-context";

export default async function SettingsPage() {
	const sessionCookie = await getSessionCookieValue();

	if (!sessionCookie) {
		redirect("/");
	}

	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
		cache: "no-store",
		headers: sessionHeaders(sessionCookie),
	});

	if (!res.ok) {
		redirect("/");
	}

	const profile: Profile = await res.json();

	return <SettingsForm initialProfile={profile} />;
}
