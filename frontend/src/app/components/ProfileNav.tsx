"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Profile } from "@/types";
import { SettingsGear } from "./SettingsProvider";
import ReportButton from "./ReportButton";
import styles from "./ProfileNav.module.css";

type Visibility = Partial<Record<"github" | "games" | "interests", boolean>>;

const ICONS: Record<string, string> = {
	home: "M3 10.5 12 3l9 7.5v9H14v-6h-4v6H3z",
	code: "m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
	activity: "M4 14c0-4 2-7 5-9l1 4 3-2c2 2 4 5 3 9-1 3-4 5-7 5s-5-3-5-7z",
	game: "M6 10h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5 2l-2-2h-6l-2 2a3 3 0 0 1-5-2v-3a4 4 0 0 1 4-4zM8 14v4M6 16h4M17 15h.01M20 17h.01",
	interest: "M4 9a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3h-1v-7h4M4 9v9h1a3 3 0 0 0 3-3v-4H4",
	logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
	shield: "M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z",
};

function Icon({ name }: { name: string }) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d={ICONS[name]} />
		</svg>
	);
}

/**
 * Notch navigation.
 * Desktop: a vertical notch attached to the LEFT edge of the screen, with
 * inverted-corner "wings" where it meets the edge.
 * Mobile (<= 900px): the same notch attached to the BOTTOM edge, horizontal.
 * The active pill slides between items; its position is measured, so one
 * implementation serves both orientations.
 */
export default function ProfileNav({
	username,
	showGithub,
	visibility,
	profile,
	activeSection = "profile",
}: {
	username: string;
	showGithub: boolean;
	visibility?: Visibility;
	profile?: Profile;
	activeSection?: string;
}) {
	const items = [
		{ href: `/${username}`, icon: "home", label: "Profile", visible: true },
		{
			href: `/${username}/github`,
			icon: "code",
			label: "GitHub",
			visible: showGithub && (visibility?.github !== false || profile?.is_owner),
		},
		{ href: `/${username}/activity`, icon: "activity", label: "Activity", visible: true },
		{
			href: `/${username}/games`,
			icon: "game",
			label: "Games",
			visible: visibility?.games !== false || profile?.is_owner,
		},
		{
			href: `/${username}/interests`,
			icon: "interest",
			label: "Interests",
			visible: visibility?.interests !== false || profile?.is_owner,
		},
	].filter((item) => item.visible);

	const railRef = useRef<HTMLDivElement>(null);
	const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

	useLayoutEffect(() => {
		const rail = railRef.current;
		if (!rail) return;
		const measure = () => {
			const active = rail.querySelector<HTMLElement>('[data-active="true"]');
			setPill(
				active
					? { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight }
					: null,
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(rail);
		window.addEventListener("resize", measure);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [activeSection, items.length]);

	const isStaff =
		profile?.is_owner && (profile.viewer_role === "moderator" || profile.viewer_role === "admin");

	return (
		<nav className={styles.rail} aria-label="Profile navigation" ref={railRef}>
			{pill && (
				<span
					className={styles.pill}
					aria-hidden="true"
					style={{
						width: pill.w,
						height: pill.h,
						transform: `translate(${pill.x}px, ${pill.y}px)`,
					}}
				/>
			)}
			{items.map((item) => {
				const active = activeSection === item.label.toLowerCase();
				return (
					<Link
						key={item.href}
						href={item.href}
						className={`${styles.item} ${active ? styles.active : ""}`}
						data-active={active}
						data-label={item.label}
						aria-label={item.label}
						aria-current={active ? "page" : undefined}
					>
						<Icon name={item.icon} />
					</Link>
				);
			})}

			{profile && (
				<>
					<span className={styles.divider} aria-hidden="true" />
					{profile.is_owner ? (
						<>
							<SettingsGear
								section="profile"
								label="Profile settings"
								className={styles.tool}
							/>
							<form
								action="/api/auth/logout"
								method="POST"
								className={styles.toolForm}
								onSubmit={(event) => {
									if (!window.confirm("Are you sure you want to log out?")) {
										event.preventDefault();
									}
								}}
							>
								<button
									type="submit"
									className={styles.tool}
									aria-label="Log out"
									data-label="Log out"
								>
									<Icon name="logout" />
								</button>
							</form>
							{isStaff && (
								<Link
									href="/mod"
									className={styles.tool}
									aria-label="Moderation"
									data-label="Moderation"
								>
									<Icon name="shield" />
								</Link>
							)}
						</>
					) : profile.viewer_role === "anonymous" ? (
						<Link
							href="/directory?login=1"
							className={styles.tool}
							aria-label="Log in to report"
							data-label="Log in to report"
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M5 21V4m0 0h11l-1.5 4L16 12H5" />
							</svg>
						</Link>
					) : (
						<ReportButton username={profile.username} iconOnly className={styles.tool} />
					)}
				</>
			)}
		</nav>
	);
}
