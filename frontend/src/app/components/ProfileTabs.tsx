"use client";

import { useRef, useState } from "react";
import styles from "./ProfileTabs.module.css";

export interface TabDef {
	id: string;
	label: string;
	badge?: number;
	/** Rendered on the server; every panel ships in the initial HTML so switching never refetches. */
	content: React.ReactNode;
}

export default function ProfileTabs({
	tabs,
	initial,
}: {
	tabs: TabDef[];
	initial?: string;
}) {
	const [active, setActive] = useState(
		tabs.some((t) => t.id === initial) ? (initial as string) : tabs[0].id,
	);
	const refs = useRef<Record<string, HTMLButtonElement | null>>({});

	const select = (id: string, focus = false) => {
		setActive(id);
		const url = new URL(window.location.href);
		if (id === tabs[0].id) url.searchParams.delete("tab");
		else url.searchParams.set("tab", id);
		window.history.replaceState(null, "", url);
		if (focus) refs.current[id]?.focus();
	};

	const onKeyDown = (event: React.KeyboardEvent, index: number) => {
		const last = tabs.length - 1;
		const next =
			event.key === "ArrowRight"
				? (index + 1) % tabs.length
				: event.key === "ArrowLeft"
					? (index - 1 + tabs.length) % tabs.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? last
							: null;
		if (next === null) return;
		event.preventDefault();
		select(tabs[next].id, true);
	};

	return (
		<>
			<div className={styles.barWrap}>
				<div className={styles.bar} role="tablist" aria-label="Profile">
					{tabs.map((tab, i) => (
						<button
							key={tab.id}
							ref={(el) => {
								refs.current[tab.id] = el;
							}}
							type="button"
							role="tab"
							id={`tab-${tab.id}`}
							aria-controls={`panel-${tab.id}`}
							aria-selected={active === tab.id}
							tabIndex={active === tab.id ? 0 : -1}
							className={`${styles.tab} ${active === tab.id ? styles.active : ""}`}
							onClick={() => select(tab.id)}
							onKeyDown={(e) => onKeyDown(e, i)}
						>
							{tab.label}
							{tab.badge ? (
								<span className={styles.badge}>{tab.badge}</span>
							) : null}
						</button>
					))}
				</div>
			</div>
			{tabs.map((tab) => (
				<div
					key={tab.id}
					role="tabpanel"
					id={`panel-${tab.id}`}
					aria-labelledby={`tab-${tab.id}`}
					hidden={active !== tab.id}
				>
					{tab.content}
				</div>
			))}
		</>
	);
}
