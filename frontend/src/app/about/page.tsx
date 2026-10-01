import StaticPage from "@/app/components/StaticPage";

export default function AboutPage() {
	return (
		<StaticPage title="About DevAtlas">
			<p>
				DevAtlas is an open-source directory of developer profiles. Sign
				in with GitHub, add your stack, projects, games and interests,
				and share one link.
			</p>
			<p>
				GitHub stats come from the GitHub API and refresh periodically.
				LeetCode numbers are self-reported by each user.
			</p>
			<p>
				DevAtlas is an independent community project, built and
				maintained by one developer on free hosting. Occasional slow
				loads are expected.
			</p>
			<p>
				<a
					href="https://github.com/Acestar21/devatlas"
					target="_blank"
					rel="noreferrer"
				>
					Source code on GitHub ↗
				</a>
			</p>
		</StaticPage>
	);
}
