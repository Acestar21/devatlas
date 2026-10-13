import json
import unittest

from app.models.github_stats import GithubStatsCache
from app.routers.badge import SVG_HEADERS, generate_badge_svg


class BadgeSvgSafetyTests(unittest.TestCase):
    def test_svg_headers_disable_sniffing_and_external_content(self):
        self.assertEqual(SVG_HEADERS["X-Content-Type-Options"], "nosniff")
        self.assertEqual(
            SVG_HEADERS["Content-Security-Policy"],
            "default-src 'none'; style-src 'unsafe-inline'",
        )

    def test_escapes_username_without_stats(self):
        svg = generate_badge_svg('<script>alert("x")</script>', None)

        self.assertIn(
            "Stats not yet available for &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
            svg,
        )
        self.assertNotIn("<script>", svg)

    def test_escapes_username_and_languages(self):
        stats = GithubStatsCache(
            user_id=1,
            total_contributions=12,
            top_languages_json=json.dumps(['<script>alert("x")</script>']),
        )

        svg = generate_badge_svg('" onload="alert(1)', stats)

        self.assertIn("@&quot; onload=&quot;alert(1)", svg)
        self.assertIn("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;", svg)
        self.assertNotIn("<script>", svg)
