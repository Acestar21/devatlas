"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Profile } from "@/types";
import EditProfileModal from "./EditProfileModal";
import styles from "./SettingsGear.module.css";

interface SettingsContextValue {
	isOwner: boolean;
	open: (section: string) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
	isOwner: false,
	open: () => {},
});

/**
 * Owns the ONE settings modal for a whole page.
 *
 * Why this exists: the modal used to be rendered by each "Edit settings"
 * button, i.e. inside whatever popover/menu/card contained that button. Any
 * click-outside handler or re-render of that parent unmounted the modal, so the
 * window vanished on the first click. Now the modal lives at page level and the
 * gear buttons only ask for it to open, so no parent can tear it down.
 */
export function SettingsProvider({
	profile,
	children,
}: {
	profile: Profile;
	children: React.ReactNode;
}) {
	const [section, setSection] = useState<string | null>(null);
	const open = useCallback((next: string) => setSection(next), []);
	const value = useMemo(
		() => ({ isOwner: profile.is_owner, open }),
		[profile.is_owner, open],
	);

	return (
		<SettingsContext.Provider value={value}>
			{children}
			{profile.is_owner && section && (
				<EditProfileModal
					key={section}
					profile={profile}
					section={section}
					onClose={() => setSection(null)}
				/>
			)}
		</SettingsContext.Provider>
	);
}

export function useSettings() {
	return useContext(SettingsContext);
}

function GearIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
			<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
			<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
		</svg>
	);
}

/** Icon-only settings button for the right side of a card/section header. Owner only. */
export function SettingsGear({
	section,
	label,
	className = "",
}: {
	section: string;
	label?: string;
	className?: string;
}) {
	const { isOwner, open } = useSettings();
	if (!isOwner) return null;
	const text = label ?? `Edit ${section} settings`;
	return (
		<button
			type="button"
			className={`${styles.gear} ${className}`}
			onClick={() => open(section)}
			aria-label={text}
			title={text}
		>
			<GearIcon />
		</button>
	);
}
