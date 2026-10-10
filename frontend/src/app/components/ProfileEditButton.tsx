"use client";

import { Profile } from "@/types";
import { SettingsGear } from "./SettingsProvider";

/**
 * Kept for the existing call sites. It is now just the owner's gear icon; the
 * settings modal itself is owned once by SettingsProvider in [username]/layout.tsx,
 * so no card or menu that renders this button can unmount it.
 */
export default function ProfileEditButton({
	section = "profile",
}: {
	profile?: Profile;
	section?: string;
}) {
	return <SettingsGear section={section} />;
}
