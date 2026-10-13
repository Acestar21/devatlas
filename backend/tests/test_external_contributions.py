"""External contributions: only real, public contributions to repos the user doesn't own."""
import unittest

from app.services.github import summarize_external


def repo(name_with_owner, owner, private=False, org=False):
    return {
        "nameWithOwner": name_with_owner, "url": f"https://github.com/{name_with_owner}",
        "isPrivate": private, "stargazerCount": 10,
        "owner": {"login": owner, "__typename": "Organization" if org else "User"},
    }


class ExternalContributionTests(unittest.TestCase):
    def test_own_repos_are_excluded_case_insensitively(self):
        cc = {"commitContributionsByRepository": [
            {"repository": repo("Kushal/mine", "Kushal"), "contributions": {"nodes": [{"commitCount": 5}]}}]}
        self.assertEqual(summarize_external(cc, "kushal"), [])

    def test_private_repos_never_leak(self):
        cc = {"pullRequestContributionsByRepository": [
            {"repository": repo("acme/secret", "acme", private=True, org=True), "contributions": {"totalCount": 3}}]}
        self.assertEqual(summarize_external(cc, "kushal"), [])

    def test_all_four_kinds_merge_per_repo(self):
        r = repo("psf/requests", "psf", org=True)
        cc = {
            "commitContributionsByRepository": [{"repository": r, "contributions": {"nodes": [{"commitCount": 2}, {"commitCount": 3}]}}],
            "pullRequestContributionsByRepository": [{"repository": r, "contributions": {"totalCount": 1}}],
            "issueContributionsByRepository": [{"repository": r, "contributions": {"totalCount": 4}}],
            "pullRequestReviewContributionsByRepository": [{"repository": r, "contributions": {"totalCount": 6}}],
        }
        (row,) = summarize_external(cc, "kushal")
        self.assertEqual(
            (row["commits"], row["pull_requests"], row["issues"], row["reviews"], row["is_org"]),
            (5, 1, 4, 6, True),
        )

    def test_zero_activity_rows_are_dropped_and_sorted_by_volume(self):
        cc = {"pullRequestContributionsByRepository": [
            {"repository": repo("a/small", "a"), "contributions": {"totalCount": 1}},
            {"repository": repo("b/big", "b"), "contributions": {"totalCount": 9}},
            {"repository": repo("c/none", "c"), "contributions": {"totalCount": 0}},
        ]}
        self.assertEqual([r["repo"] for r in summarize_external(cc, "kushal")], ["b/big", "a/small"])

    def test_missing_data_is_safe(self):
        self.assertEqual(summarize_external({}, "kushal"), [])
        self.assertEqual(summarize_external({"commitContributionsByRepository": None}, "kushal"), [])


if __name__ == "__main__":
    unittest.main()
