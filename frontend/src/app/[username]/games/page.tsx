import { notFound } from "next/navigation";
import GameDetailCard from "@/app/components/GameDetailCard";
import Panel from "@/app/components/Panel";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";
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
		<SectionPlaceholder profile={profile} title="Games">
			<Panel label="Games" gearSection="games" gearLabel="Edit games" muted={sectionMuted}>
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
			</Panel>
			{showHandles && (
				<Panel label="Find me on" gearSection="games" gearLabel="Edit gaming handles" muted={handlesMuted}>
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
				</Panel>
			)}
		</SectionPlaceholder>
	);
}
