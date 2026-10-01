"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
	ContentLink,
	Post,
	Profile,
	SectionVisibility,
	StackTag,
} from "@/types";
import { proxyFetch } from "@/lib/api-client";
import styles from "./EditProfileModal.module.css";

const DEFAULT_VISIBILITY: SectionVisibility = {
	github: true,
	leetcode: true,
	games: true,
	interests: true,
};

const CARD_LABELS: Record<string, Record<string, string>> = {
	github: {
		graph: "Contribution graph",
		stats: "GitHub statistics",
		pinned: "Pinned repos",
		languages: "Top languages",
		activity: "Recent activity",
	},
	activity: { leetcode: "LeetCode stats", posts: "Writing / blog posts" },
};

export default function EditProfileModal({
	profile,
	section = "profile",
	onClose,
}: {
	profile: Profile;
	section?: string;
	onClose: () => void;
}) {
	const router = useRouter();
	const isProfileSettings = section === "profile";
	const isLinksSettings = section === "links";
	const isGithub = section === "github";
	const isActivity = section === "activity";
	const isLeetcode = section === "leetcode";
	const canEditLinks = isProfileSettings || isLinksSettings;
	const canSave = canEditLinks || isGithub || isActivity || isLeetcode;
	const page = isActivity ? "activity" : "github";

	const github = profile.content_links.find(
		(link) => link.label.toLowerCase() === "github",
	);
	const linkedin = profile.content_links.find(
		(link) => link.label.toLowerCase() === "linkedin",
	);
	const portfolio = profile.content_links.find(
		(link) => !["github", "linkedin"].includes(link.label.toLowerCase()),
	);
	const [displayName, setDisplayName] = useState(profile.display_name || "");
	const [bio, setBio] = useState(profile.bio || "");
	const [githubUrl, setGithubUrl] = useState(github?.url || "");
	const [linkedinUrl, setLinkedinUrl] = useState(linkedin?.url || "");
	const [portfolioUrl, setPortfolioUrl] = useState(portfolio?.url || "");
	const [additionalLinks, setAdditionalLinks] = useState<ContentLink[]>(
		profile.content_links
			.filter(
				(link) =>
					!["github", "linkedin", "portfolio"].includes(
						link.label.toLowerCase(),
					),
			)
			.slice(0, 10),
	);
	const [newLinkLabel, setNewLinkLabel] = useState("");
	const [newLinkUrl, setNewLinkUrl] = useState("");
	const [visibility, setVisibility] = useState(
		profile.section_visibility || DEFAULT_VISIBILITY,
	);
	const [stackTags, setStackTags] = useState<StackTag[]>(profile.stack_tags);
	const [search, setSearch] = useState("");
	const [results, setResults] = useState<StackTag[]>([]);
	const [unmatchedTokens, setUnmatchedTokens] = useState<string[]>([]);
	const [cards, setCards] = useState<Record<string, boolean>>(
		profile.card_visibility?.[page] ?? {},
	);
	const [posts, setPosts] = useState<Post[]>(profile.posts ?? []);
	const [postTitle, setPostTitle] = useState("");
	const [postUrl, setPostUrl] = useState("");
	const [lcUser, setLcUser] = useState(profile.leetcode?.username ?? "");
	const [lcEasy, setLcEasy] = useState(String(profile.leetcode?.easy ?? 0));
	const [lcMedium, setLcMedium] = useState(
		String(profile.leetcode?.medium ?? 0),
	);
	const [lcHard, setLcHard] = useState(String(profile.leetcode?.hard ?? 0));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const searchStack = async (value: string) => {
		setSearch(value);
		if (!value) {
			setResults([]);
			setUnmatchedTokens([]);
			return;
		}
		const tokens = value
			.split(",")
			.map((token) => token.trim())
			.filter(Boolean);
		const responses = await Promise.all(
			tokens.map(async (token) => ({
				token,
				response: await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/tags?category=stack&search=${encodeURIComponent(token)}`,
				),
			})),
		);
		const tokenResults = await Promise.all(
			responses.map(async ({ token, response }) => ({
				token,
				tags: response.ok
					? ((await response.json()) as StackTag[])
					: [],
			})),
		);
		const unique = new Map<number, StackTag>();
		tokenResults
			.flatMap(({ tags }) => tags)
			.forEach((tag) => unique.set(tag.id, tag));
		setResults([...unique.values()]);
		setUnmatchedTokens(
			tokenResults
				.filter(({ tags }) => tags.length === 0)
				.map(({ token }) => token),
		);
	};

	const addStackTag = async (tag: StackTag) => {
		await fetch(`/api/proxy/profiles/me/stack/${tag.id}`, {
			method: "POST",
		});
		setStackTags((current) =>
			current.some((item) => item.id === tag.id)
				? current
				: [...current, tag],
		);
		setSearch("");
		setResults([]);
		setUnmatchedTokens([]);
	};

	const removeStackTag = async (id: number) => {
		await fetch(`/api/proxy/profiles/me/stack/${id}`, { method: "DELETE" });
		setStackTags((current) => current.filter((tag) => tag.id !== id));
	};

	const addAllStackMatches = async () => {
		for (const tag of results) await addStackTag(tag);
	};

	const submitStack = async () => {
		const names =
			unmatchedTokens.length > 0
				? unmatchedTokens
				: search
						.split(",")
						.map((token) => token.trim())
						.filter(Boolean);
		const submissions = await Promise.all(
			names.map((name) =>
				proxyFetch<{ status?: string; name?: string }>(
					`tags?name=${encodeURIComponent(name)}&category=stack`,
					{ method: "POST" },
				),
			),
		);
		const pending = submissions
			.filter((result) => result.status === "pending")
			.map((result) => result.name)
			.join(", ");
		if (pending) setError(`Submitted for review: ${pending}.`);
		setSearch("");
		setResults([]);
		setUnmatchedTokens([]);
	};

	const saveLeetcode = () =>
		proxyFetch("profiles/me/leetcode", {
			method: "POST",
			body: JSON.stringify({
				username: lcUser.trim(),
				easy: Number(lcEasy) || 0,
				medium: Number(lcMedium) || 0,
				hard: Number(lcHard) || 0,
			}),
		});

	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			if (isLeetcode) {
				await saveLeetcode();
				router.refresh();
				onClose();
				return;
			}
			if (isGithub || isActivity) {
				if (isActivity && lcUser.trim()) await saveLeetcode();
				await proxyFetch("profiles/me", {
					method: "PATCH",
					body: JSON.stringify({
						card_visibility: { [page]: cards },
						...(isActivity ? { posts } : {}),
					}),
				});
				router.refresh();
				onClose();
				return;
			}
			const contentLinks: ContentLink[] = isProfileSettings
				? [
						...(githubUrl
							? [{ label: "GitHub", url: githubUrl }]
							: []),
						...(linkedinUrl
							? [{ label: "LinkedIn", url: linkedinUrl }]
							: []),
						...(portfolioUrl
							? [{ label: "Portfolio", url: portfolioUrl }]
							: []),
					]
				: [
						...(github?.url
							? [{ label: "GitHub", url: github.url }]
							: []),
						...(linkedin?.url
							? [{ label: "LinkedIn", url: linkedin.url }]
							: []),
						...(portfolio?.url
							? [{ label: "Portfolio", url: portfolio.url }]
							: []),
						...additionalLinks,
					].slice(0, 13);
			await proxyFetch("profiles/me", {
				method: "PATCH",
				body: JSON.stringify({
					...(isProfileSettings
						? {
								display_name: displayName,
								bio,
								content_links: contentLinks,
								section_visibility: visibility,
							}
						: { content_links: contentLinks }),
				}),
			});
			router.refresh();
			onClose();
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Unable to save settings.",
			);
		} finally {
			setSaving(false);
		}
	};

	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			className={styles.backdrop}
			role="presentation"
			onMouseDown={(event) =>
				event.target === event.currentTarget && onClose()
			}
		>
			<section
				className={styles.modal}
				role="dialog"
				aria-modal="true"
				aria-labelledby="edit-profile-title"
			>
				<div className={styles.header}>
					<div>
						<p className={styles.eyebrow}>
							Owner settings · {section}
						</p>
						<h2 id="edit-profile-title">Edit {section} settings</h2>
					</div>
					<button
						className={styles.close}
						onClick={onClose}
						aria-label="Close settings"
					>
						×
					</button>
				</div>

				{(isGithub || isActivity) && (
					<div className={styles.visibility}>
						<span>
							Visible cards — hidden ones are muted for you and
							invisible to everyone else
						</span>
						{Object.entries(CARD_LABELS[page]).map(
							([key, label]) => (
								<label key={key}>
									<input
										type="checkbox"
										checked={cards[key] ?? true}
										onChange={(event) =>
											setCards((current) => ({
												...current,
												[key]: event.target.checked,
											}))
										}
									/>
									{label}
								</label>
							),
						)}
					</div>
				)}

				{(isLeetcode || isActivity) && (
					<>
						<label className={styles.field}>
							LeetCode username
							<input
								placeholder="username, not URL"
								value={lcUser}
								onChange={(event) =>
									setLcUser(event.target.value)
								}
							/>
						</label>
						<div className={styles.grid}>
							<label className={styles.field}>
								Easy
								<input
									type="number"
									min={0}
									value={lcEasy}
									onChange={(event) =>
										setLcEasy(event.target.value)
									}
								/>
							</label>
							<label className={styles.field}>
								Medium
								<input
									type="number"
									min={0}
									value={lcMedium}
									onChange={(event) =>
										setLcMedium(event.target.value)
									}
								/>
							</label>
							<label className={styles.field}>
								Hard
								<input
									type="number"
									min={0}
									value={lcHard}
									onChange={(event) =>
										setLcHard(event.target.value)
									}
								/>
							</label>
						</div>
						<p className={styles.help}>
							Self-reported. Shown as such on your profile.
						</p>
					</>
				)}

				{isActivity && (
					<>
						<div className={styles.linkList}>
							{posts.map((post, index) => (
								<div
									className={styles.linkEditor}
									key={`${post.url}-${index}`}
								>
									<span>
										{post.title}
										<small>{post.url}</small>
									</span>
									<button
										onClick={() =>
											setPosts((current) =>
												current.filter(
													(_, i) => i !== index,
												),
											)
										}
									>
										×
									</button>
								</div>
							))}
						</div>
						{posts.length < 10 && (
							<div className={styles.grid}>
								<label className={styles.field}>
									Post title
									<input
										value={postTitle}
										onChange={(event) =>
											setPostTitle(event.target.value)
										}
									/>
								</label>
								<label className={styles.field}>
									Post URL
									<input
										placeholder="https://..."
										value={postUrl}
										onChange={(event) =>
											setPostUrl(event.target.value)
										}
									/>
								</label>
								<button
									className={styles.addLink}
									onClick={() => {
										if (
											postTitle.trim() &&
											postUrl.trim()
										) {
											setPosts((current) => [
												...current,
												{
													title: postTitle.trim(),
													url: postUrl.trim(),
												},
											]);
											setPostTitle("");
											setPostUrl("");
										}
									}}
								>
									Add post
								</button>
							</div>
						)}
						<p className={styles.help}>
							Up to 10 posts. Saved when you click Save.
						</p>
					</>
				)}

				{canEditLinks && (
					<>
						{isProfileSettings && (
							<>
								<label className={styles.field}>
									Display name
									<input
										value={displayName}
										onChange={(event) =>
											setDisplayName(event.target.value)
										}
									/>
								</label>
								<p className={styles.help}>
									This name appears below your avatar on the
									profile card.
								</p>
								<label className={styles.field}>
									Bio / About me
									<textarea
										value={bio}
										onChange={(event) =>
											setBio(event.target.value)
										}
										rows={3}
										placeholder="Tell people about yourself"
									/>
								</label>
							</>
						)}
						<div className={styles.grid}>
							{isProfileSettings && (
								<>
									<label className={styles.field}>
										GitHub URL
										<input
											placeholder="https://github.com/..."
											value={githubUrl}
											onChange={(event) =>
												setGithubUrl(event.target.value)
											}
										/>
									</label>
									<label className={styles.field}>
										LinkedIn URL
										<input
											placeholder="https://linkedin.com/in/..."
											value={linkedinUrl}
											onChange={(event) =>
												setLinkedinUrl(
													event.target.value,
												)
											}
										/>
									</label>
									<label className={styles.field}>
										Portfolio URL
										<input
											placeholder="https://your-site.com"
											value={portfolioUrl}
											onChange={(event) =>
												setPortfolioUrl(
													event.target.value,
												)
											}
										/>
									</label>
								</>
							)}
						</div>
						{isProfileSettings ? (
							<p className={styles.help}>
								Add zero to three redirects. These control the
								quick-link buttons in the identity card.
							</p>
						) : (
							<>
								<div className={styles.linkList}>
									{additionalLinks.map((link, index) => (
										<div
											className={styles.linkEditor}
											key={`${link.url}-${index}`}
										>
											<span>
												{link.label}
												<small>{link.url}</small>
											</span>
											<button
												onClick={() =>
													setAdditionalLinks(
														(current) =>
															current.filter(
																(
																	_,
																	itemIndex,
																) =>
																	itemIndex !==
																	index,
															),
													)
												}
											>
												×
											</button>
										</div>
									))}
								</div>
								{additionalLinks.length < 10 && (
									<div className={styles.grid}>
										<label className={styles.field}>
											Link label
											<input
												placeholder="Blog, Discord, etc."
												value={newLinkLabel}
												onChange={(event) =>
													setNewLinkLabel(
														event.target.value,
													)
												}
											/>
										</label>
										<label className={styles.field}>
											Link URL
											<input
												placeholder="https://..."
												value={newLinkUrl}
												onChange={(event) =>
													setNewLinkUrl(
														event.target.value,
													)
												}
											/>
										</label>
										<button
											className={styles.addLink}
											onClick={() => {
												if (
													newLinkLabel &&
													newLinkUrl
												) {
													setAdditionalLinks(
														(current) => [
															...current,
															{
																label: newLinkLabel,
																url: newLinkUrl,
															},
														],
													);
													setNewLinkLabel("");
													setNewLinkUrl("");
												}
											}}
										>
											Add link
										</button>
									</div>
								)}
								<p className={styles.help}>
									You can add up to 10 additional links shown
									in the Links section.
								</p>
							</>
						)}
					</>
				)}

				{!canSave && (
					<div className={styles.placeholder}>
						Settings for {section} are coming soon.
					</div>
				)}

				{isProfileSettings && (
					<>
						<div className={styles.field}>
							<span>Stack</span>
							<div className={styles.tagRow}>
								{stackTags.map((tag) => (
									<span className={styles.tag} key={tag.id}>
										{tag.name}
										<button
											onClick={() =>
												removeStackTag(tag.id)
											}
											aria-label={`Remove ${tag.name}`}
										>
											×
										</button>
									</span>
								))}
							</div>
							<input
								placeholder="Search technologies, separated by commas"
								value={search}
								onChange={(event) =>
									searchStack(event.target.value)
								}
							/>
							{results.length > 0 && (
								<div className={styles.results}>
									{search.includes(",") && (
										<button onClick={addAllStackMatches}>
											Add all matching tags
										</button>
									)}
									{results.map((tag) => (
										<button
											key={tag.id}
											onClick={() => addStackTag(tag)}
										>
											{tag.name}
										</button>
									))}
								</div>
							)}
							{unmatchedTokens.length > 0 && (
								<button
									className={styles.submitNewButton}
									onClick={submitStack}
								>
									Submit unmatched tags for review
								</button>
							)}
						</div>
						<div className={styles.visibility}>
							<span>Visible sections</span>
							{(
								Object.keys(
									DEFAULT_VISIBILITY,
								) as (keyof SectionVisibility)[]
							).map((key) => (
								<label key={key}>
									<input
										type="checkbox"
										checked={visibility[key]}
										onChange={(event) =>
											setVisibility((current) => ({
												...current,
												[key]: event.target.checked,
											}))
										}
									/>
									{key}
								</label>
							))}
						</div>
					</>
				)}

				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
				<div className={styles.actions}>
					<button className={styles.cancel} onClick={onClose}>
						{canSave ? "Cancel" : "Close"}
					</button>
					{canSave && (
						<button
							className={styles.save}
							onClick={save}
							disabled={saving}
						>
							{saving ? "Saving..." : "Save settings"}
						</button>
					)}
				</div>
			</section>
		</div>,
		document.body,
	);
}
