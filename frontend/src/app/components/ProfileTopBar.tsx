import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/types";
import ThemeSwitcher from "./ThemeSwitcher";
import QuickGuide from "./QuickGuide";
import styles from "./ProfileTopBar.module.css";

export default function ProfileTopBar({
	viewer,
	theme,
	active,
	showQuickGuide = false,
}: {
	viewer: Profile | null;
	theme: string;
	active?: "directory";
	showQuickGuide?: boolean;
}) {
	return (
		<header className={styles.bar}>
			<Link href="/directory" className={styles.brand}>
				DevAtlas<span aria-hidden="true">_</span>
			</Link>
			<div className={styles.actions}>
				{showQuickGuide && (
					<div className={styles.guideSlot}>
						<QuickGuide topbar />
					</div>
				)}
				<ThemeSwitcher initialTheme={theme} mobileIcon />
				<Link
					href="/directory"
					className={`${styles.pill} ${active === "directory" ? styles.pillActive : ""}`}
					aria-current={active === "directory" ? "page" : undefined}
				>
					/Directory
				</Link>
				{viewer ? (
					<Link
						href={`/${viewer.username}`}
						aria-label="Open your profile"
					>
						<Image
							src={viewer.avatar_url || "/default-avatar.png"}
							alt=""
							width={36}
							height={36}
							loading="eager"
							className={styles.avatar}
						/>
					</Link>
				) : (
					<Link href="/directory?login=1" className={styles.pill}>
						/login
					</Link>
				)}
			</div>
		</header>
	);
}
