import StaticPage from "@/app/components/StaticPage";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_APPEAL_EMAIL;

export const metadata = { title: "Privacy · DevAtlas" };

export default function PrivacyPage() {
	return (
		<StaticPage title="Privacy">
			<p>Last updated: October 2026. DevAtlas is a small open-source project run by one person. This page explains, in plain language, what it stores and why.</p>

			<h2>What we store</h2>
			<ul>
				<li><strong>From GitHub when you sign in:</strong> your numeric GitHub ID, username, display name and avatar URL. We ask for the read-only <code>read:user</code> scope only; we cannot access your repositories&apos; contents.</li>
				<li><strong>Your GitHub access token,</strong> encrypted at rest. It is used to fetch your public stats and activity and is never shown to anyone.</li>
				<li><strong>Cached GitHub stats:</strong> contribution counts, pinned repositories, languages and recent public activity, refreshed at most every 6 hours.</li>
				<li><strong>What you add yourself:</strong> bio, links, blog posts, stack and interest tags, games and gaming handles, LeetCode numbers (self-reported), theme and visibility settings.</li>
				<li><strong>Moderation records:</strong> reports, suspensions and an internal audit log (details below).</li>
			</ul>

			<h2>Who can see it</h2>
			<p>Your profile is public. You can hide whole sections or individual cards; hidden data is not sent to other visitors at all. Moderators can also see your profile content and any reports about you. Your GitHub token and MFA data are never visible to anyone.</p>

			<h2>Cookies and local storage</h2>
			<ul>
				<li><code>devcard_session</code>: keeps you signed in (httpOnly, 14 days).</li>
				<li><code>devatlas-theme</code> and a matching local-storage entry: remember your theme (1 year).</li>
			</ul>
			<p>DevAtlas currently uses no advertising or analytics trackers.</p>

			<h2>Where it is processed</h2>
			<p>The website runs on Vercel, the API on Render, and the database on Neon (Postgres). Stats come from the GitHub API.</p>

			<h2>Reports and moderation</h2>
			<ul>
				<li>When you report a profile, we keep your GitHub username and ID with the report to stop report abuse. This is cleared 180 days after the report is closed.</li>
				<li>When a profile is suspended, the audit log keeps the account&apos;s GitHub ID for up to 365 days so repeat violations can be recognised. Audit-log entries (who did what, and notes) are otherwise kept.</li>
				<li>Suspended profiles are hidden from the public. The owner sees the reason and can still edit.</li>
			</ul>

			<h2>Deleting your account</h2>
			<p>Open your profile, choose Edit settings, then Danger zone. Deletion removes your profile, tag links, games, LeetCode stats, posts, cached stats and stored token, and revokes DevAtlas&apos; authorization on GitHub. Reports about you are deleted. Reports you filed stay, with your identity details cleared on the schedule above. Tags you submitted that other people use stay, without your name. Our database host keeps short-term restore history, so deleted data can persist in backups briefly.</p>
			<p>Suspended accounts cannot delete themselves until the suspension ends or a moderator lifts it. Contact us if that is a problem.</p>

			<h2>Contact</h2>
			<p>{CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : "See the contact links on the GitHub repository."}</p>
		</StaticPage>
	);
}