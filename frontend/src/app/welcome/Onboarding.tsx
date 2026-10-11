"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TagEditor from "@/app/components/TagEditor";
import { proxyFetch } from "@/lib/api-client";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";
import styles from "./welcome.module.css";

const STARTERS = [
	"Building ___ in public.",
	"Learning ___ this year.",
	"Coffee-powered full-stack dev.",
	"Open-source tinkerer.",
];
const LINK_LABELS = ["Portfolio", "LinkedIn", "Website", "Blog", "X / Twitter"];
const STEPS = 4; // intro, bio, tags, link

export default function Onboarding({
	username,
	displayName,
	avatarUrl,
}: {
	username: string;
	displayName: string;
	avatarUrl: string | null;
}) {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [bio, setBio] = useState("");
	const [linkLabel, setLinkLabel] = useState(LINK_LABELS[0]);
	const [linkUrl, setLinkUrl] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const markDone = () => {
		document.cookie = `${ONBOARDED_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax`;
	};

	const skip = () => {
		markDone();
		router.push("/directory");
	};

	const finish = async () => {
		setSaving(true);
		setError(null);
		const body: Record<string, unknown> = {};
		if (bio.trim()) body.bio = bio.trim();
		if (linkUrl.trim()) {
			const url = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
			body.content_links = [{ label: linkLabel, url }];
		}
		try {
			if (Object.keys(body).length > 0) {
				await proxyFetch("profiles/me", { method: "PATCH", body: JSON.stringify(body) });
			}
			markDone();
			router.push(`/${username}`);
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not save. Try again.");
			setSaving(false);
		}
	};

	const firstName = displayName.split(" ")[0];

	return (
		<div className={styles.wrap}>
			<div className={styles.card}>
				<div className={styles.top}>
					<ol className={styles.dots} aria-label={`Step ${step + 1} of ${STEPS}`}>
						{Array.from({ length: STEPS }, (_, i) => (
							<li key={i} className={i <= step ? styles.dotOn : ""} />
						))}
					</ol>
					<button type="button" className={styles.skip} onClick={skip}>
						Skip setup
					</button>
				</div>

				{step === 0 && (
					<section key="intro" className={styles.step}>
						<Image
							src={avatarUrl || "/default-avatar.png"}
							alt=""
							width={84}
							height={84}
							className={styles.avatar}
						/>
						<h1>Hey {firstName}, welcome in.</h1>
						<p>
							Your GitHub stats are already on your profile. Let&apos;s add the human
							part. It takes about a minute, and every step is optional.
						</p>
					</section>
				)}

				{step === 1 && (
					<section key="bio" className={styles.step}>
						<h1>Say hi in a sentence.</h1>
						<p>A short bio shows up on your profile and in the directory.</p>
						<textarea
							className={styles.input}
							rows={3}
							maxLength={280}
							value={bio}
							placeholder="What are you into right now?"
							onChange={(event) => setBio(event.target.value)}
							aria-label="Bio"
						/>
						<div className={styles.chips} aria-label="Starter ideas">
							{STARTERS.map((starter) => (
								<button
									type="button"
									key={starter}
									onClick={() => setBio((current) => (current ? `${current} ${starter}` : starter).slice(0, 280))}
								>
									{starter}
								</button>
							))}
						</div>
						<span className={styles.count}>{bio.length}/280</span>
					</section>
				)}

				{step === 2 && (
					<section key="tags" className={styles.step}>
						<h1>What do you build with?</h1>
						<p>Pick your tools and a few interests. These save as you add them.</p>
						<TagEditor category="stack" label="Stack" initial={[]} basePath="profiles/me/stack" />
						<TagEditor category="interest" label="Interests" initial={[]} basePath="profiles/me/interests" />
					</section>
				)}

				{step === 3 && (
					<section key="link" className={styles.step}>
						<h1>Where can people find you?</h1>
						<p>Add one link now. You can add more later from your profile.</p>
						<div className={styles.linkRow}>
							<select
								className={styles.input}
								value={linkLabel}
								onChange={(event) => setLinkLabel(event.target.value)}
								aria-label="Link type"
							>
								{LINK_LABELS.map((label) => (
									<option key={label}>{label}</option>
								))}
							</select>
							<input
								className={styles.input}
								value={linkUrl}
								placeholder="yoursite.dev"
								onChange={(event) => setLinkUrl(event.target.value)}
								aria-label="Link URL"
							/>
						</div>
					</section>
				)}

				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}

				<div className={styles.actions}>
					{step > 0 ? (
						<button type="button" className={styles.back} onClick={() => setStep(step - 1)} disabled={saving}>
							Back
						</button>
					) : (
						<span />
					)}
					{step < STEPS - 1 ? (
						<button type="button" className={styles.next} onClick={() => setStep(step + 1)}>
							{step === 0 ? "Let’s go" : "Next"}
						</button>
					) : (
						<button type="button" className={styles.next} onClick={finish} disabled={saving}>
							{saving ? "Saving…" : "Finish"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
