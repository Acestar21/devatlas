"use client";

import Link from "next/link";
import { useState } from "react";
import { Profile } from "@/types";
import ProfileEditButton from "./ProfileEditButton";
import styles from "./ProfileNav.module.css";
import ReportButton from "./ReportButton";

export default function ProfileNav({
	username,
	showGithub,
	visibility,
	profile,
	activeSection = "profile",
	sectionLinks = false,
}: {
	username: string;
	showGithub: boolean;
	visibility?: Partial<Record<"github" | "games" | "interests", boolean>>;
	profile?: Profile;
	activeSection?: string;
	sectionLinks?: boolean;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const items = [
		{
			href: `/${username}`,
			icon: "profile",
			label: "Profile",
			section: "profile",
			visible: true,
			disabled: false,
		},
		{
			href: sectionLinks ? `/${username}#projects` : `/${username}/github`,
			icon: "github",
			label: sectionLinks ? "Projects" : "GitHub",
			section: sectionLinks ? "projects" : "github",
			visible:
				showGithub &&
				(visibility?.github !== false || profile?.is_owner),
			disabled: false,
		},
		{
			href: sectionLinks ? `/${username}#activity` : `/${username}/activity`,
			icon: "activity",
			label: "Activity",
			section: "activity",
			visible: true,
			disabled: false,
		},
		{
			href: sectionLinks ? `/${username}#games` : `/${username}/games`,
			icon: "games",
			label: "Games",
			section: "games",
			visible: visibility?.games !== false || profile?.is_owner,
			disabled: false,
		},
		{
			href: sectionLinks ? `/${username}#interests` : `/${username}/interests`,
			icon: "interests",
			label: "Interests",
			section: "interests",
			visible: visibility?.interests !== false || profile?.is_owner,
			disabled: false,
		},
	];
	if (sectionLinks) {
		items.push(
			{
				href: `/${username}#stack`,
				icon: "github",
				label: "Stack",
				section: "stack",
				visible: true,
				disabled: false,
			},
			{
				href: `/${username}#links`,
				icon: "profile",
				label: "Links",
				section: "links",
				visible: true,
				disabled: false,
			},
		);
	}

	const icon = (name: string) => {
		return <span className={`${styles.iconGlyph} ${styles[`icon-${name}`]}`} aria-hidden="true" />;
	};

	return (
		<nav className={styles.nav} aria-label="Profile navigation">
			{items
				.filter((item) => item.visible)
				.map((item) =>
					item.disabled ? (
						<span
							key={item.label}
							className={`${styles.item} ${styles.disabled}`}
							aria-label={`${item.label} coming soon`}
						>
							<span className={styles.icon}>
								{icon(item.icon)}
							</span>
							<span className={styles.label}>
								{item.label}
								<small>Coming Soon</small>
							</span>
						</span>
					) : (
						<Link
							key={item.href}
							href={item.href}
							title={item.label}
							aria-label={item.label}
							className={`${styles.item} ${activeSection === item.section ? styles.active : ""}`}
						>
							<span className={styles.icon}>
								{icon(item.icon)}
							</span>
							<span className={styles.label}>{item.label}</span>
						</Link>
					),
				)}
			{profile?.is_owner && (
				<div className={styles.controls}>
					<button
						type="button"
						className={styles.menuButton}
						onClick={() => setMenuOpen((open) => !open)}
						aria-label="Open profile menu"
						aria-expanded={menuOpen}
					>
						<span />
						<span />
						<span />
					</button>
					{menuOpen && (
						<div className={styles.menu}>
							<ProfileEditButton
								profile={profile}
								section={activeSection}
							/>
							<form
								action="/api/auth/logout"
								method="POST"
								onSubmit={(event) => {
									if (
										!window.confirm(
											"Are you sure you want to log out?",
										)
									) {
										event.preventDefault();
									}
								}}
							>
								<div className={styles.menuDivider} />
								<button type="submit" className={styles.logout}>
									Log out
								</button>
							</form>
						</div>
					)}
				</div>
			)}
			{profile &&
				!profile.is_owner &&
				profile.viewer_role !== "anonymous" && (
					<div className={styles.edit}>
						<ReportButton username={profile.username} />
					</div>
				)}
			{profile &&
				!profile.is_owner &&
				profile.viewer_role === "anonymous" && (
					<Link href="/directory?login=1" className={styles.logout}>
						Log in to report
					</Link>
				)}
			{profile?.is_owner && (profile.viewer_role === "moderator" || profile.viewer_role === "admin") && (
				<Link href="/mod" className={styles.logout}>
					Moderation
				</Link>
			)}
		</nav>
	);
}
