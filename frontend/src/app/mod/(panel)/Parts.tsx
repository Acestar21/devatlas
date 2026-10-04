import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { ModCard, ReporterInfo } from "@/types-mod";
import styles from "@/app/mod/(panel)/mod.module.css";

export function StatusBadge({ card }: { card: ModCard }) {
	if (!card.suspended) return <span className={`${styles.badge} ${styles.badgeOk}`}>active</span>;
	const until = card.suspended_until ? `until ${formatDateTime(card.suspended_until)}` : "until lifted";
	return <span className={`${styles.badge} ${styles.badgeDanger}`}>suspended {until}</span>;
}

export function RoleBadge({ role }: { role: string }) {
	return role === "user" ? null : <span className={`${styles.badge} ${styles.badgeWarn}`}>{role}</span>;
}

export function Chips({ items }: { items: string[] }) {
	if (items.length === 0) return <span className={styles.muted}>—</span>;
	return <div className={styles.chips}>{items.map((item, i) => <span key={`${item}-${i}`}>{item}</span>)}</div>;
}

const REPORTER_NOTE: Record<ReporterInfo["state"], { label: string; className: string } | null> = {
	active: null,
	deleted: { label: "account deleted", className: styles.badgeWarn },
	"re-registered": { label: "re-registered", className: styles.badgeDanger },
	purged: { label: "identity purged", className: "" },
};

export function ReporterCell({ reporter }: { reporter: ReporterInfo }) {
	const note = REPORTER_NOTE[reporter.state];
	return (
		<div>
			{reporter.account_id ? <Link href={`/mod/users/${reporter.account_id}`}>@{reporter.username}</Link> : <strong>{reporter.username}</strong>}
			{note && <span className={`${styles.badge} ${note.className}`}>{note.label}</span>}
			{reporter.filed !== null && <div className={styles.muted}>{reporter.filed} filed · {reporter.dismissed} dismissed</div>}
		</div>
	);
}