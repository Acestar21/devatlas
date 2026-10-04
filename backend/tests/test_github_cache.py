import unittest
from datetime import datetime, timedelta, timezone

from app.models.github_stats import GithubStatsCache
from app.services.github import STALE_AFTER_HOURS, is_stale


class GithubCacheFreshnessTests(unittest.TestCase):
    def test_missing_cache_is_stale(self):
        self.assertTrue(is_stale(None))

    def test_aware_timestamp_at_threshold_is_fresh(self):
        cache = GithubStatsCache(
            user_id=1,
            last_fetched_at=datetime.now(timezone.utc)
            - timedelta(hours=STALE_AFTER_HOURS, seconds=-1),
        )
        self.assertFalse(is_stale(cache))

    def test_naive_database_timestamp_above_threshold_is_stale(self):
        cache = GithubStatsCache(
            user_id=1,
            last_fetched_at=(
                datetime.now(timezone.utc) - timedelta(hours=STALE_AFTER_HOURS, seconds=1)
            ).replace(tzinfo=None),
        )
        self.assertTrue(is_stale(cache))

    def test_future_timestamp_is_fresh(self):
        cache = GithubStatsCache(
            user_id=1,
            last_fetched_at=datetime.now(timezone.utc) + timedelta(minutes=1),
        )
        self.assertFalse(is_stale(cache))
