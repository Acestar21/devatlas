import StaticPage from "@/app/components/StaticPage";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_APPEAL_EMAIL;
const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

export const metadata = { title: "Community rules · DevAtlas" };

export default function RulesPage() {
	return (
		<StaticPage title="Community rules">
			<p>DevAtlas is a place to present yourself as a developer. Keep it professional enough to share with a recruiter, and respectful of other people.</p>

			<h2>Not allowed</h2>
			<ul>
				<li>Sexual, explicit, graphic or violent content, including in links you add</li>
				<li>Harassment, threats, hate speech, or targeting individuals</li>
				<li>Illegal content. Anything involving the sexual exploitation of minors is removed immediately and may be reported to the authorities.</li>
				<li>Impersonating another person or organisation</li>
				<li>Spam, scams, phishing, malware or misleading links</li>
				<li>Publishing other people&apos;s private information</li>
			</ul>

			<h2>Reporting</h2>
			<p>Use the Report button on a profile (you need to be signed in). Please only report real violations, not disagreements. Abusing the report system can get your own account restricted.</p>

			<h2>What happens next</h2>
			<ul>
				<li>Moderators review reports and may temporarily suspend a profile. A suspended profile is hidden from the public.</li>
				<li>The owner sees the reason, can edit their profile to fix the issue, and can ask for a review.</li>
				<li>Serious or repeated violations lead to longer or indefinite suspensions.</li>
			</ul>

			<h2>Appeals</h2>
			<p>
				{CONTACT_EMAIL && <>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. </>}
				{DISCORD_INVITE && <>Or join the <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">Discord server</a>. </>}
				Moderators are volunteers, so replies can take a little while.
			</p>
		</StaticPage>
	);
}