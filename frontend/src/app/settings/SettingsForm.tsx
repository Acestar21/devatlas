"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Profile,
	ContentLink,
	StackTag,
	GameEntry,
	InterestTag,
} from "@/types";
import styles from "./page.module.css";
import { proxyFetch } from "@/lib/api-client";

const THEMES = ["terminal", "coffee", "forest"];
const PLATFORMS = ["steam", "riot", "psn", "xbox", "other"];

function TagPicker({
	category,
	onAttach,
	label,
}: {
	category: "stack" | "interest" | "game";
	onAttach: (tag: { id: number; name: string }) => void;
	label: string;
}) {
	const [search, setSearch] = useState("");
	const [results, setResults] = useState<{ id: number; name: string }[]>([]);
	const [unmatchedTokens, setUnmatchedTokens] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);

	const runSearch = async (value: string) => {
		setSearch(value);
		if (value.length < 1) {
			setResults([]);
			setUnmatchedTokens([]);
			return;
		}
		const tokens = value.split(",").map((token) => token.trim()).filter(Boolean);
		const responses = await Promise.all(tokens.map(async (token) => ({ token, response: await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/tags?category=${category}&search=${encodeURIComponent(token)}`,
		) })));
		const tokenResults = await Promise.all(responses.map(async ({ token, response }) => ({ token, tags: response.ok ? await response.json() : [] })));
		const unique = new Map<number, { id: number; name: string }>();
		tokenResults.flatMap(({ tags }) => tags).forEach((tag) => unique.set(tag.id, tag));
		setResults([...unique.values()]);
		setUnmatchedTokens(tokenResults.filter(({ tags }) => tags.length === 0).map(({ token }) => token));
	};

	const submitNew = async () => {
		setSubmitting(true);
		const names = unmatchedTokens.length > 0 ? unmatchedTokens : search.split(",").map((token) => token.trim()).filter(Boolean);
		const results = await Promise.all(names.map((name) => proxyFetch<{ status?: string; name?: string }>(
			`tags?name=${encodeURIComponent(name)}&category=${category}`, { method: "POST" },
		)));
		setSubmitting(false);
		const pending = results.filter((result) => result.status === "pending").map((result) => result.name).join(", ");
		if (pending) alert(`Submitted for review: ${pending}. They'll be selectable once approved.`);
		setSearch("");
		setResults([]);
		setUnmatchedTokens([]);
	};

	const addAllMatches = () => {
		results.forEach((tag) => onAttach(tag));
		setSearch("");
		setResults([]);
		setUnmatchedTokens([]);
	};

	return (
		<div className={styles.picker}>
			<input
				className={styles.input}
				placeholder={label ? `Search ${label}...` : "Search..."}
				value={search}
				onChange={(e) => runSearch(e.target.value)}
			/>
			{results.length > 0 && (
				<div className={styles.pickerResults}>
					{search.includes(",") && <button className={styles.addMatchesButton} onClick={addAllMatches}>Add all matching tags</button>}
					{results.map((r) => (
						<button
							key={r.id}
							className={styles.pickerResult}
							onClick={() => {
								onAttach(r);
								setSearch("");
								setResults([]);
							}}
						>
							{r.name}
						</button>
					))}
				</div>
			)}
			{unmatchedTokens.length > 0 && (
				<button
					className={styles.submitNewButton}
					onClick={submitNew}
					disabled={submitting}
				>
					Can&apos;t find &quot;{search}&quot; — submit for review
				</button>
			)}
		</div>
	);
}

export default function SettingsForm({
	initialProfile,
}: {
	initialProfile: Profile;
}) {
	const router = useRouter();
	const [bio, setBio] = useState(initialProfile.bio || "");
	const [theme, setTheme] = useState(initialProfile.theme);
	const [contentLinks, setContentLinks] = useState<ContentLink[]>(
		initialProfile.content_links,
	);
	const [visibility, setVisibility] = useState(
		initialProfile.section_visibility || {
			github: true,
			leetcode: true,
			games: true,
			interests: true,
		},
	);
	const [stackTags, setStackTags] = useState<StackTag[]>(
		initialProfile.stack_tags,
	);
	const [interests, setInterests] = useState<InterestTag[]>(
		initialProfile.interests || [],
	);
	const [games, setGames] = useState<GameEntry[]>(initialProfile.games || []);

	const [newLinkLabel, setNewLinkLabel] = useState("");
	const [newLinkUrl, setNewLinkUrl] = useState("");

	const [newGameTag, setNewGameTag] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [newGameUrl, setNewGameUrl] = useState("");
	const [newGamePlatform, setNewGamePlatform] = useState("steam");
	const [newGameRank, setNewGameRank] = useState("");

	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const saveProfile = async () => {
		setSaving(true);
		setSaved(false);
		setSaveError(null);
		try {
			await proxyFetch("profiles/me", {
				method: "PATCH",
				body: JSON.stringify({ bio, theme, content_links: contentLinks, section_visibility: visibility }),
			});
			setSaved(true);
			router.refresh();
		} catch (caughtError) {
			setSaveError(caughtError instanceof Error ? caughtError.message : "Unable to save changes.");
		} finally {
			setSaving(false);
		}
	};

	const addStackTag = async (tag: { id: number; name: string }) => {
		await proxyFetch(`profiles/me/stack/${tag.id}`, { method: "POST" });
		setStackTags((prev) => [...prev, tag]);
	};

	const removeStackTag = async (id: number) => {
		await proxyFetch(`profiles/me/stack/${id}`, { method: "DELETE" });
		setStackTags((prev) => prev.filter((t) => t.id !== id));
	};

	const addInterest = async (tag: { id: number; name: string }) => {
		await proxyFetch(`profiles/me/interests/${tag.id}`, { method: "POST" });
		setInterests((prev) => [...prev, tag]);
	};

	const removeInterest = async (id: number) => {
		await proxyFetch(`profiles/me/interests/${id}`, { method: "DELETE" });
		setInterests((prev) => prev.filter((t) => t.id !== id));
	};

	const addGame = async () => {
		if (!newGameTag || !newGameUrl) return;
		const params = new URLSearchParams({
			profile_url: newGameUrl,
			platform: newGamePlatform,
			...(newGameRank ? { rank_or_hours: newGameRank } : {}),
		});
		await proxyFetch(
			`profiles/me/games/${newGameTag.id}?${params.toString()}`,
			{ method: "POST" },
		);
		setGames((prev) => [
			...prev,
			{
				tag_id: newGameTag.id,
				name: newGameTag.name,
				profile_url: newGameUrl,
				platform: newGamePlatform,
				rank_or_hours: newGameRank || null,
			},
		]);
		setNewGameTag(null);
		setNewGameUrl("");
		setNewGameRank("");
	};

	const removeGame = async (tagId: number) => {
		await proxyFetch(`profiles/me/games/${tagId}`, { method: "DELETE" });
		setGames((prev) => prev.filter((g) => g.tag_id !== tagId));
	};

	const addContentLink = () => {
		if (!newLinkLabel || !newLinkUrl) return;
		setContentLinks((prev) => [
			...prev,
			{ label: newLinkLabel, url: newLinkUrl },
		]);
		setNewLinkLabel("");
		setNewLinkUrl("");
	};

	const removeContentLink = (index: number) => {
		setContentLinks((prev) => prev.filter((_, i) => i !== index));
	};

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<div className={styles.card}>
					<div className={styles.topBar}>
						<h1 className={styles.title}>Settings</h1>
						<a
							href={`/${initialProfile.username}`}
							className={styles.backLink}
						>
							← Back to profile
						</a>
					</div>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Bio</h2>
						<textarea
							className={styles.textarea}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							placeholder="Tell people about yourself"
							rows={3}
						/>
					</section>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Theme</h2>
						<div className={styles.themeRow}>
							{THEMES.map((t) => (
								<button
									key={t}
									className={`${styles.themeOption} ${theme === t ? styles.themeSelected : ""}`}
									onClick={() => setTheme(t)}
								>
									{t}
								</button>
							))}
						</div>
					</section>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Stack</h2>
						<div className={styles.tagRow}>
							{stackTags.map((t) => (
								<span key={t.id} className={styles.tagChip}>
									{t.name}
									<button
										onClick={() => removeStackTag(t.id)}
										className={styles.removeX}
									>
										×
									</button>
								</span>
							))}
						</div>
						<TagPicker
							category="stack"
							label="a technology"
							onAttach={addStackTag}
						/>
					</section>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Interests</h2>
						<div className={styles.tagRow}>
							{interests.map((t) => (
								<span key={t.id} className={styles.tagChip}>
									{t.name}
									<button
										onClick={() => removeInterest(t.id)}
										className={styles.removeX}
									>
										×
									</button>
								</span>
							))}
						</div>
						<TagPicker
							category="interest"
							label="an interest"
							onAttach={addInterest}
						/>
					</section>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Games</h2>
						<div className={styles.gameList}>
							{games.map((g) => (
								<div key={g.tag_id} className={styles.gameRow}>
									<span>
										{g.name} — {g.platform}
										{g.rank_or_hours
											? ` (${g.rank_or_hours})`
											: ""}
									</span>
									<button
										onClick={() => removeGame(g.tag_id)}
										className={styles.removeX}
									>
										×
									</button>
								</div>
							))}
						</div>

						<div className={styles.gameForm}>
							{!newGameTag ? (
								<TagPicker
									category="game"
									label="a game"
									onAttach={(tag) => setNewGameTag(tag)}
								/>
							) : (
								<div className={styles.gameFormFields}>
									<span className={styles.gameFormSelected}>
										{newGameTag.name}{" "}
										<button
											onClick={() => setNewGameTag(null)}
											className={styles.removeX}
										>
											×
										</button>
									</span>
									<select
										className={styles.inputSmall}
										value={newGamePlatform}
										onChange={(e) =>
											setNewGamePlatform(e.target.value)
										}
									>
										{PLATFORMS.map((p) => (
											<option key={p} value={p}>
												{p}
											</option>
										))}
									</select>
									<input
										className={styles.inputSmall}
										placeholder="Profile URL"
										value={newGameUrl}
										onChange={(e) =>
											setNewGameUrl(e.target.value)
										}
									/>
									<input
										className={styles.inputSmall}
										placeholder="Rank / hours (optional)"
										value={newGameRank}
										onChange={(e) =>
											setNewGameRank(e.target.value)
										}
									/>
									<button
										onClick={addGame}
										className={styles.addButton}
									>
										Add
									</button>
								</div>
							)}
						</div>
					</section>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Links</h2>
						<div className={styles.linkList}>
							{contentLinks.map((link, i) => (
								<div key={i} className={styles.linkRow}>
									<span>
										{link.label}: {link.url}
									</span>
									<button
										onClick={() => removeContentLink(i)}
										className={styles.removeX}
									>
										×
									</button>
								</div>
							))}
						</div>
						<div className={styles.linkForm}>
							<input
								className={styles.inputSmall}
								placeholder="Label (e.g. Blog)"
								value={newLinkLabel}
								onChange={(e) => setNewLinkLabel(e.target.value)}
							/>
							<input
								className={styles.inputSmall}
								placeholder="https://..."
								value={newLinkUrl}
								onChange={(e) => setNewLinkUrl(e.target.value)}
							/>
							<button
								onClick={addContentLink}
								className={styles.addButton}
							>
								Add
							</button>
						</div>
					</section>
				</div>

				<div className={styles.card}>
					<section className={styles.section}>
						<h2 className={styles.sectionLabel}>Visibility</h2>
						<p className={styles.hint}>
							Hidden sections are invisible to everyone but you.
						</p>
						{(
							["github", "leetcode", "games", "interests"] as const
						).map((key) => (
							<label key={key} className={styles.checkboxRow}>
								<input
									type="checkbox"
									checked={visibility[key]}
									onChange={(e) =>
										setVisibility((prev) => ({
											...prev,
											[key]: e.target.checked,
										}))
									}
								/>
								{key}
							</label>
						))}
					</section>
				</div>

				{saveError && <p className={styles.error} role="alert">{saveError}</p>}
				<button
					onClick={saveProfile}
					className={styles.saveButton}
					disabled={saving}
				>
					{saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
				</button>
			</div>
		</main>
	);
}
