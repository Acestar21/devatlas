import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Profile } from "@/types";
import SectionPlaceholder from "@/app/components/SectionPlaceholder";
import GameCard from "@/app/components/GameCard";
import styles from "./page.module.css";
import { loadProfile } from "@/lib/profile-api";

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
	if (profile.section_visibility?.games === false && !profile.is_owner)
		notFound();

	const games = profile.games ?? [];
	const handles = profile.gaming_handles ?? [];
	const sectionMuted = profile.section_visibility?.games === false;
	const handlesMuted =
		sectionMuted || profile.card_visibility?.games?.handles === false;
	const showHandles = handles.length > 0 || profile.is_owner;

	return (
		<SectionPlaceholder profile={profile} title="Games">
			<section
				className={`${styles.card}${sectionMuted ? ` ${styles.muted}` : ""}`}
			>
				<p className={styles.label}>Games</p>
				{games.length ? (
					<div className={styles.grid}>
						{games.map((game, i) => (
							<GameCard key={`${game.name}-${i}`} game={game} />
						))}
					</div>
				) : (
					<p className={styles.empty}>
						{profile.is_owner
							? "No games yet — use Edit settings to add some."
							: "Nothing here yet."}
					</p>
				)}
			</section>
			{showHandles && (
				<section
					className={`${styles.card}${handlesMuted ? ` ${styles.muted}` : ""}`}
				>
					<p className={styles.label}>Find me on</p>
					{handles.length ? (
						<div className={styles.handles}>
							{handles.map((h, i) => (
								<span key={`${h.platform}-${i}`}>
									<em>
										{HANDLE_LABEL[h.platform] ?? h.platform}
									</em>
									{h.handle}
								</span>
							))}
						</div>
					) : (
						<p className={styles.empty}>No handles added yet.</p>
					)}
				</section>
			)}
		</SectionPlaceholder>
	);
}
