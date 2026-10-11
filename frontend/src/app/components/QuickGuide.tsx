"use client";

import { useSyncExternalStore } from "react";
import styles from "./QuickGuide.module.css";

const DISMISS_KEY = "devatlas-profile-guide-dismissed";
const GUIDE_CHANGE_EVENT = "devatlas-profile-guide-change";

function subscribe(onStoreChange: () => void) {
	window.addEventListener("storage", onStoreChange);
	window.addEventListener(GUIDE_CHANGE_EVENT, onStoreChange);
	return () => {
		window.removeEventListener("storage", onStoreChange);
		window.removeEventListener(GUIDE_CHANGE_EVENT, onStoreChange);
	};
}

function getSnapshot() {
	try {
		return window.localStorage.getItem(DISMISS_KEY) === "true";
	} catch {
		return false;
	}
}

function getServerSnapshot() {
	return false;
}

const GUIDE_ITEMS = [
	{
		title: "Profile banner",
		question: "How do I add a profile banner?",
		content: (
			<>
				<p>
					Open your GitHub repository named after your username
					(e.g. <code>github.com/username/username</code>).
				</p>
				<p>
					Create the folder <code>&apos;devatlas/&apos;</code> in that repo then add an image inside named <code>&apos;banner.jpg&apos;</code>, <code>&apos;banner.png&apos;</code>, or{" "}
					<code>&apos;banner.webp&apos;</code>.
				</p>
				<p>
					Commit the image to the repositor&apos;s default branch.
					DevAtlas checks for the banner automatically; updates may
					take up to 6 hours to appear.
				</p>
			</>
		),
	},
	{
		title: "Project banner",
		question: "How do I add a project banner?",
		content: (
			<>
				<p>
					Open your GitHub pinned project repository
					(e.g. <code>github.com/username/repo</code>).
				</p>
				<p>
					Create the folder <code>&apos;devatlas/&apos;</code> in that repo at root, then add an image inside named <code>&apos;banner.jpg&apos;</code>, <code>&apos;banner.png&apos;</code>, or{" "}
					<code>&apos;banner.webp&apos;</code>.
				</p>
				<p>
					Commit the image to the repository&apos;s default branch.
					DevAtlas checks for the banner automatically; updates may
					take up to 6 hours to appear.
				</p>
			</>
		),
	},
	{
		title: "Tags",
		question: "How do I add stack tags or interests?",
		content: (
			<>
				<p>
					Use the profile settings gear to manage your stack tags and
					interests. Stack tags describe the technologies you work with;
					interests describe topics and hobbies you care about. Search
					for available tags and select the ones that fit you. These
					also help other developers discover shared interests.
				</p>
				<p>
					If there are tags that doesn&apos;t exist and you need them for your profile, {" "}
					Submit them for review after typing the tag you want and the admin will approve it if valid.
				</p>
			</>
		),
	},
	{
		title: "Supported values",
		question: "What should I enter in profile fields?",
		content: (
			<p>
				Use the format expected by each field. For example, links
				should point to the relevant website or project, and game
				entries should identify the game you play. For tag-based
				fields, choose from the available tags rather than inventing
				a new spelling. If a value isn&apos;t accepted, check the field&apos;s
				label and validation message.
			</p>
		),
	},
	{
		title: "Customization",
		question: "How do I customize my profile?",
		content: (
			<p>
				Use the profile settings gear to edit supported profile
				details, and the theme switcher to change the appearance.
				Add a bio, stack tags, interests, links, and other available
				details to make your profile more useful to people viewing it.
			</p>
		),
	},
	{
		title: "Visibility controls",
		question: "How do I hide a section or card?",
		content: (
			<>
			<p>
				Open profile settings and look for the relevant visibility
				controls. You can hide supported sections or individual
				cards from other visitors. Check the public profile after
				changing visibility to confirm what other people can see.
			</p>	
			<p>
				Cards whose visiblity are turned off will be greyed out for the owner. 
			</p>
			</>
		),
	},
];

export default function QuickGuide({
	topbar = false,
	mobile = false,
}: {
	topbar?: boolean;
	mobile?: boolean;
}) {
	const dismissed = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	const dismiss = () => {
		window.localStorage.setItem(DISMISS_KEY, "true");
		window.dispatchEvent(new Event(GUIDE_CHANGE_EVENT));
	};

	const reopen = () => {
		window.localStorage.removeItem(DISMISS_KEY);
		window.dispatchEvent(new Event(GUIDE_CHANGE_EVENT));
	};

	if (dismissed) {
		return (
			<div
				className={`${styles.collapsed} ${topbar ? styles.topbarCollapsed : ""} ${
					mobile ? styles.mobileGuide : ""
				}`}
			>
				<button
					type="button"
					className={styles.infoButton}
					onClick={reopen}
					aria-label="Show the profile quick guide"
					title="Show the profile quick guide"
				>
					i
				</button>
			</div>
		);
	}

	return (
		<section
			className={`${styles.guide} ${topbar ? styles.topbarGuide : ""} ${
				mobile ? styles.mobileGuide : ""
			}`}
			aria-labelledby="profile-guide-title"
		>
			<div className={styles.header}>
				<div>
					<p className={styles.eyebrow}>Quick guide</p>
					<h2 id="profile-guide-title">Make your profile yours</h2>
				</div>
				<button
					type="button"
					className={styles.dismiss}
					onClick={dismiss}
					aria-label="Dismiss the profile quick guide"
				>
					×
				</button>
			</div>
			<ul className={styles.list}>
				{GUIDE_ITEMS.map((item) => (
					<li key={item.title} className={styles.item}>
						<strong>{item.title}</strong>
						<details>
							<summary>{item.question}</summary>
							<div>{item.content}</div>
						</details>
					</li>
				))}
			</ul>
		</section>
	);
}
