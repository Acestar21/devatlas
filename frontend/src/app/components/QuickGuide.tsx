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
		title: "GitHub banner",
		question: "How do I add a GitHub banner?",
	},
	{
		title: "Tags",
		question: "How do I add stack tags or interests?",
	},
	{
		title: "Supported values",
		question: "Which values and formats are supported?",
	},
	{
		title: "Customization",
		question: "How do I customize my profile?",
	},
	{
		title: "Visibility controls",
		question: "How do I hide a section or card?",
	},
];

export default function QuickGuide() {
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
			<div className={styles.collapsed}>
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
		<section className={styles.guide} aria-labelledby="profile-guide-title">
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
							<p>Placeholder: add your instructions here.</p>
						</details>
					</li>
				))}
			</ul>
		</section>
	);
}
