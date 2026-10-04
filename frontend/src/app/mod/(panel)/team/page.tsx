import { modGet } from "@/lib/mod-api";
import { TeamMember } from "@/types-mod";
import TeamTools from "./TeamTools";
import styles from "../mod.module.css";

export default async function TeamPage() {
	const team = await modGet<{ moderators: TeamMember[] }>("mod/team");
	return (
		<>
			<h1>Team</h1>
			<p className={styles.muted}>Admin only. Moderators can&apos;t see this page.</p>
			<TeamTools moderators={team.moderators} />
		</>
	);
}