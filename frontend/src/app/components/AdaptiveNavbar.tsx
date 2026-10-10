"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./AdaptiveNavbar.module.css";

type Viewer = {
	username: string;
	avatar_url: string | null;
};

type NavItem = {
	id: string;
	label: string;
	href: string;
	icon: string;
};

const ITEMS: NavItem[] = [
	{ id: "directory", label: "Directory", href: "/directory", icon: "directory" },
	{ id: "about", label: "About", href: "/about", icon: "about" },
	{ id: "contribute", label: "Contribute", href: "/contribute", icon: "contribute" },
];

function getActiveId(pathname: string): string {
	if (pathname === "/directory" || pathname === "/") return "directory";
	const match = ITEMS.find((item) => pathname.startsWith(item.href));
	return match?.id || "directory";
}

export default function AdaptiveNavbar({
	viewer,
	initialTheme,
}: {
	viewer: Viewer | null;
	initialTheme: string;
}) {
	const pathname = usePathname();
	const rootRef = useRef<HTMLElement>(null);
	const [open, setOpen] = useState(false);
	const activeId = getActiveId(pathname);
	const activeItem = ITEMS.find((item) => item.id === activeId) || ITEMS[0];

	useEffect(() => {
		if (!open) return;
		const closeOnPointer = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const closeOnKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("pointerdown", closeOnPointer);
		document.addEventListener("keydown", closeOnKey);
		return () => {
			document.removeEventListener("pointerdown", closeOnPointer);
			document.removeEventListener("keydown", closeOnKey);
		};
	}, [open]);

	const logo = (
		<Link href="/directory" className={styles.logo} aria-label="DevAtlas home">
			<span className={styles.logoMark} aria-hidden="true">D</span>
			<span className={styles.logoText}>DevAtlas</span>
		</Link>
	);

	const rightContent = (
		<div className={styles.actions}>
			<ThemeSwitcher initialTheme={initialTheme} mobileIcon />
			{viewer ? (
				<Link href={`/${viewer.username}`} className={styles.avatarLink} aria-label="Open your profile">
					<Image
						src={viewer.avatar_url || "/default-avatar.png"}
						alt="Your profile"
						width={32}
						height={32}
						loading="eager"
						className={styles.avatar}
					/>
				</Link>
			) : (
				<Link href="/directory?login=1" className={styles.loginLink}>
					<span className={styles.loginLabel}>Log in</span>
					<span aria-hidden="true">↗</span>
				</Link>
			)}
		</div>
	);

	return (
		<header className={styles.shell} ref={rootRef}>
			<div className={styles.desktopLogo}>{logo}</div>
			<nav className={styles.desktopNav} aria-label="Primary navigation">
				{ITEMS.map((item) => (
					<Link
						key={item.id}
						href={item.href}
						className={`${styles.navItem} ${item.id === activeId ? styles.active : ""}`}
						aria-current={item.id === activeId ? "page" : undefined}
					>
						<span className={`${styles.icon} ${styles[`icon-${item.icon}`]}`} aria-hidden="true" />
						<span>{item.label}</span>
					</Link>
				))}
			</nav>
			<div className={styles.desktopActions}>{rightContent}</div>

			<div className={styles.mobileIsland}>
				{logo}
				<button
					type="button"
					className={styles.mobileTrigger}
					onClick={() => setOpen((value) => !value)}
					aria-expanded={open}
					aria-haspopup="listbox"
					aria-label="Toggle navigation menu"
				>
					<span className={`${styles.icon} ${styles[`icon-${activeItem.icon}`]}`} aria-hidden="true" />
					<span>{activeItem.label}</span>
					<span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">⌄</span>
				</button>
				<div className={styles.mobileActions}>{rightContent}</div>
				{open && (
					<div className={styles.mobileMenu} role="listbox" aria-label="Navigation options">
						{ITEMS.map((item) => (
							<Link
								key={item.id}
								href={item.href}
								role="option"
								aria-selected={item.id === activeId}
								className={`${styles.mobileItem} ${item.id === activeId ? styles.mobileItemActive : ""}`}
								onClick={() => setOpen(false)}
							>
								<span className={`${styles.icon} ${styles[`icon-${item.icon}`]}`} aria-hidden="true" />
								<span>{item.label}</span>
								{item.id === activeId && <span aria-hidden="true">✓</span>}
							</Link>
						))}
					</div>
				)}
			</div>
		</header>
	);
}
