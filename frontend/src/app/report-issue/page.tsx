import StaticPage from "@/app/components/StaticPage";

export default function ReportIssuePage() {
	return (
		<StaticPage title="Report an issue">
			<p>
				Found a bug or something broken? Open an issue on GitHub with
				what you did, what you expected, and what happened instead.
			</p>
			<p>
				<a
					href="https://github.com/Acestar21/devatlas/issues/new"
					target="_blank"
					rel="noreferrer"
				>
					Open a new issue ↗
				</a>
			</p>
		</StaticPage>
	);
}
