import pathlib
import re
import unittest

APP = pathlib.Path(__file__).resolve().parents[1] / "app"
HELPER_FILES = {"time.py"}
BANNED = re.compile(r"datetime\.utcnow\(|utcfromtimestamp\(|datetime\.now\(|\.fromtimestamp\(")


class TimeConventionTests(unittest.TestCase):
    def test_no_raw_clock_calls_outside_the_helper(self):
        """Database datetimes are naive UTC. All 'now' values go through the helper; the only
        exception is a line marked '# tz-aware ok' (the GitHub account-age check in routers/auth.py)."""
        offenders = []
        for path in APP.rglob("*.py"):
            if path.name in HELPER_FILES:
                continue
            for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if BANNED.search(line) and "# tz-aware ok" not in line:
                    offenders.append(f"{path.relative_to(APP.parent)}:{number}: {line.strip()}")
        self.assertEqual(offenders, [], "Use the time helper:\n" + "\n".join(offenders))