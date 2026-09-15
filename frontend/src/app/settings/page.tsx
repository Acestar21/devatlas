import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Profile } from "@/types";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get("devcard_session");

	if (!sessionCookie) {
		redirect("/");
	}

	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profiles/me`, {
		cache: "no-store",
		headers: { Cookie: `devcard_session=${sessionCookie.value}` },
	});

	if (!res.ok) {
		redirect("/");
	}

	const profile: Profile = await res.json();

	return <SettingsForm initialProfile={profile} />;
}
