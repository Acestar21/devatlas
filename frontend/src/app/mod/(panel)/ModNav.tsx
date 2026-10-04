"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./mod.module.css";

const TABS = [
	{ href: "/mod", label: "Reports", exact: true },
	{ href: "/mod/users", label: "Users" },
	{ href: "/mod/tags", label: "Tags" },
	{ href: "/mod/log", label: "Audit log" },
	{ href: "/mod/team", label: "Team", adminOnly: true },
];

export default function ModNav({ isAdmin }: { isAdmin: boolean }) {
	const pathname = usePathname();
	return (
		<nav className={styles.nav} aria-label="Moderation sections">
			{TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => {
				const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
				return (
					<Link key={tab.href} href={tab.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}