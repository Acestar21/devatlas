import { notFound } from "next/navigation";
import Card from "@/app/components/Card";
import GameDetailCard from "@/app/components/GameDetailCard";
import ProfileEditButton from "@/app/components/ProfileEditButton";
import SubpageHeader from "@/app/components/SubpageHeader";
import { loadProfile } from "@/lib/profile-api";
import styles from "./page.module.css";

const HANDLE_LABEL: Record<string, string> = {
	steam: "Steam",
	riot: "Riot ID",
	psn: "PSN",
	xbox: "Xbox",
	epic: "Epic",
	discord: "Discord",
	other: "Other",
};

export default async function GamesPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	const profile = await loadProfile(username);
	if (profile.section_visibility?.games === false && !profile.is_owner) notFound();

	const games = profile.games ?? [];
	const handles = profile.gaming_handles ?? [];
	const sectionMuted = profile.section_visibility?.games === false;
	const handlesMuted = sectionMuted || profile.card_visibility?.games?.handles === false;
	const showHandles = handles.length > 0 || profile.is_owner;

	return (
		<>
			<SubpageHeader username={profile.username} title="Games" />
			<Card title="Games" muted={sectionMuted} action={<ProfileEditButton section="games" />}>
				{games.length ? (
					<div className={styles.grid}>
						{games.map((game, i) => (
							<GameDetailCard key={`${game.name}-${i}`} game={game} />
						))}
					</div>
				) : (
					<p className={styles.empty}>
						{profile.is_owner ? "No games yet. Use the gear to add some." : "Nothing here yet."}
					</p>
				)}
			</Card>
			{showHandles && (
				<Card title="Find me on" muted={handlesMuted} action={<ProfileEditButton section="games" />}>
					{handles.length ? (
						<div className={styles.handles}>
							{handles.map((h, i) => (
								<span key={`${h.platform}-${i}`}>
									<em>{HANDLE_LABEL[h.platform] ?? h.platform}</em>
									{h.handle}
								</span>
							))}
						</div>
					) : (
						<p className={styles.empty}>No handles added yet.</p>
					)}
				</Card>
			)}
		</>
	);
}
