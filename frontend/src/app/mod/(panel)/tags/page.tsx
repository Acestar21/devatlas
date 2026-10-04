import { modGet } from "@/lib/mod-api";
import { ApprovedTag, DuplicateGroup, MfaStatus, PendingTag } from "@/types-mod";
import TagTools from "./TagTools";

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
	const { category: rawCategory, q = "" } = await searchParams;
	const category = rawCategory === "interest" ? "interest" : "stack";
	const me = await modGet<MfaStatus>("mfa/status");
	const isAdmin = me.role === "admin";

	const [pending, approved, duplicates] = await Promise.all([
		modGet<PendingTag[]>("mod/tags/pending"),
		modGet<ApprovedTag[]>(`mod/tags?category=${category}&q=${encodeURIComponent(q)}`),
		isAdmin ? modGet<DuplicateGroup[]>("mod/tags/duplicates") : Promise.resolve([] as DuplicateGroup[]),
	]);

	return (
		<>
			<h1>Tags</h1>
			<TagTools pending={pending} approved={approved} duplicates={duplicates} isAdmin={isAdmin} category={category} q={q} />
		</>
	);
}