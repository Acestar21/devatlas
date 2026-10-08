"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./AppShell.module.css";

type Viewer = {
	username: string;
	avatar_url: string | null;
};

export default function MobileNav({
	viewer,
	initialTheme,
}: {
	viewer: Viewer | null;
	initialTheme: string;
}) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const firstLinkRef = useRef<HTMLAnchorElement>(null);

	useEffect(() => {
		if (!open) return;
		firstLinkRef.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
				buttonRef.current?.focus();
			}
			if (
				event.key === "ArrowDown" &&
				document.activeElement === firstLinkRef.current
			) {
				event.preventDefault();
				menuRef.current
					?.querySelector<HTMLAnchorElement>("a:nth-of-type(2)")
					?.focus();
			}
		};
		const onPointerDown = (event: PointerEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("pointerdown", onPointerDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("pointerdown", onPointerDown);
		};
	}, [open]);

	return (
		<div className={styles.mobileNav} ref={menuRef}>
			<button
				ref={buttonRef}
				type="button"
				className={styles.menuButton}
				aria-expanded={open}
				aria-controls="mobile-navigation"
				onClick={() => setOpen((value) => !value)}
			>
				Menu
			</button>
			{open && (
				<nav
					id="mobile-navigation"
					className={styles.mobileMenu}
					aria-label="Mobile navigation"
				>
					<Link ref={firstLinkRef} href="/directory">
						Directory
					</Link>
					{viewer ? (
						<Link href={`/${viewer.username}`}>Your profile</Link>
					) : (
						<Link href="/directory?login=1">Log in</Link>
					)}
					<ThemeSwitcher initialTheme={initialTheme} />
					{viewer && (
						<Image
							src={viewer.avatar_url || "/default-avatar.png"}
							alt=""
							width={32}
							height={32}
							className={styles.mobileAvatar}
						/>
					)}
				</nav>
			)}
		</div>
	);
}
