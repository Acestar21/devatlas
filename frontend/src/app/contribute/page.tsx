import StaticPage from "@/app/components/StaticPage";

export default function ContributePage() {
	return (
		<StaticPage title="Contribute">
			<p>
				DevAtlas is open source. Bug fixes, UI polish and new profile
				sections are all welcome.
			</p>
			<ul>
				<li>Browse open issues and pick one</li>
				<li>
					Fork the repo, make your change, and open a pull request
				</li>
				<li>Keep changes focused; one concern per PR</li>
			</ul>
			<p>
				<a
					href="https://github.com/Acestar21/devatlas/issues"
					target="_blank"
					rel="noreferrer"
				>
					Open issues ↗
				</a>{" "}
				·{" "}
				<a
					href="https://github.com/Acestar21/devatlas"
					target="_blank"
					rel="noreferrer"
				>
					Repository ↗
				</a>
			</p>
		</StaticPage>
	);
}
