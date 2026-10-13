"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./ProfileTopBar.module.css";

export default function ProfileMenu({
	viewer,
	theme,
}: {
	viewer: { username: string; avatar_url: string | null };
	theme: string;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const close = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, []);

	return (
		<div className={styles.profileMenu} ref={menuRef}>
			<button
				type="button"
				className={styles.avatarButton}
				onClick={() => setMenuOpen((value) => !value)}
				aria-expanded={menuOpen}
				aria-haspopup="menu"
				aria-label="Open profile menu"
			>
				<Image
					src={viewer.avatar_url || "/default-avatar.png"}
					alt=""
					width={36}
					height={36}
					loading="eager"
					className={styles.avatar}
				/>
			</button>
			{menuOpen && (
				<div className={styles.menu} role="menu">
					<Link href={`/${viewer.username}`} role="menuitem" onClick={() => setMenuOpen(false)}>
						My profile
					</Link>
					<div className={styles.menuTheme} role="menuitem">
						<ThemeSwitcher initialTheme={theme} />
					</div>
					<Link href="/directory" role="menuitem" onClick={() => setMenuOpen(false)}>
						Directory
					</Link>
					<Link href="/journal" role="menuitem" onClick={() => setMenuOpen(false)}>
						Journal
					</Link>
				</div>
			)}
		</div>
	);
}
