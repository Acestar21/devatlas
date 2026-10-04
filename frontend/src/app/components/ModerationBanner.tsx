import { Profile } from "@/types";
import { formatDateTime } from "@/lib/format";
import styles from "./ModerationBanner.module.css";

const APPEAL_EMAIL = process.env.NEXT_PUBLIC_APPEAL_EMAIL;
const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

/** Shown to the owner of a suspended profile, and to staff viewing one (nobody else can load it). */
export default function ModerationBanner({ profile }: { profile: Profile }) {
	const info = profile.moderation;
	if (!info?.suspended) return null;
	const until = info.until ? `until ${formatDateTime(info.until)}` : "until a moderator lifts it";

	if (!profile.is_owner) {
		return (
			<div className={styles.banner} role="status">
				<strong>Suspended: hidden from the public, visible to staff only</strong> ({until}). Reason: {info.reason}
			</div>
		);
	}

	return (
		<div className={styles.banner} role="status">
			<strong>Your profile is hidden from the public</strong> ({until}). Reason: {info.reason}
			<br />
			You can still edit it. If you think this is a mistake, or you&apos;ve fixed the issue, contact the moderators
			{APPEAL_EMAIL && <>: <a href={`mailto:${APPEAL_EMAIL}`}>{APPEAL_EMAIL}</a></>}
			{DISCORD_INVITE && <> or <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">join our Discord</a></>}.
		</div>
	);
}