import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend";
import { MfaStatus } from "@/types-mod";
import ElevationTimer from "./ElevationTimer";
import ModNav from "./ModNav";
import styles from "./mod.module.css";

export const metadata = {
	title: "Moderation · DevAtlas",
	robots: { index: false, follow: false },
};

export default async function ModLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const response = await backendFetch("mfa/status");
	if (!response.ok) notFound(); // logged out (401) or not staff (404): the panel doesn't exist for them
	const status = (await response.json()) as MfaStatus;
	if (!status.elevated || !status.elevated_until) redirect("/mod/mfa");

	return (
		<div className={styles.shell}>
			<header className={styles.header}>
				<div>
					<strong>DevAtlas moderation</strong>
					<span className={styles.role}>{status.role}</span>
					<span className={styles.muted}>@{status.username}</span>
				</div>
				<div className={styles.headerRight}>
					<ElevationTimer until={status.elevated_until} />
					<Link href="/mod/mfa">Session</Link>
					<Link href="/directory">← Site</Link>
				</div>
			</header>
			<ModNav isAdmin={status.role === "admin"} />
			<main className={styles.content}>{children}</main>
		</div>
	);
}
