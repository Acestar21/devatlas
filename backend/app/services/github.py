import asyncio
import json
import logging
import httpx
from cryptography.fernet import InvalidToken
from sqlmodel import Session, select

from app.models.user import User
from app.models.github_stats import GithubStatsCache
from app.time import as_utc, utc_now
from app.auth.crypto import decrypt_token

logger = logging.getLogger(__name__)

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

STALE_AFTER_HOURS = 6

STATS_QUERY = """
query($login: String!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    pullRequests { totalCount }
    contributionsCollection {
      commitContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner url isPrivate stargazerCount owner { login __typename } }
        contributions(first: 100) { nodes { commitCount } }
      }
      pullRequestContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner url isPrivate stargazerCount owner { login __typename } }
        contributions { totalCount }
      }
      issueContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner url isPrivate stargazerCount owner { login __typename } }
        contributions { totalCount }
      }
      pullRequestReviewContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner url isPrivate stargazerCount owner { login __typename } }
        contributions { totalCount }
      }
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          stargazerCount
          url
          description
        }
      }
    }
    repositories(first: 10, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER, privacy: PUBLIC) {
      nodes {
        name
        stargazerCount
        url
        description
        primaryLanguage { name }
      }
    }
    ownedRepos: repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes { stargazerCount }
    }
  }
}
"""


class GithubTokenInvalid(Exception):
    """Raised when the stored access token is rejected by GitHub.
    OAuth App tokens do not expire on a timer and have no refresh
    mechanism (that's a GitHub Apps-only feature) — if this is raised,
    the token has been revoked (by the user or by GitHub) and the only
    fix is the user logging in again. Caller should degrade gracefully
    (serve stale cache) rather than crash.
    """
    pass


async def _run_graphql_query(access_token: str, username: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=10) as client:
        return await client.post(
            GITHUB_GRAPHQL_URL,
            json={"query": STATS_QUERY, "variables": {"login": username}},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )


MAX_EXTERNAL_REPOS = 12


def summarize_external(cc: dict, login: str) -> list[dict]:
    """Contributions to PUBLIC repositories the user does not own, merged per repository.

    "Actual contributions": every number comes from GitHub's contribution data (commits, pull
    requests, issues, reviews), so a repo the user merely owns, forks or has access to never
    appears unless they really contributed. Repos owned by the user themself are dropped, and
    private repos are always dropped (names must never leak). Organisation-owned repos count as
    external: the user doesn't personally own them.
    """
    me = (login or "").lower()
    repos: dict[str, dict] = {}

    def add(items, field, count):
        for item in items or []:
            repo = item.get("repository") or {}
            owner = repo.get("owner") or {}
            owner_login = owner.get("login") or ""
            if repo.get("isPrivate") or not owner_login or owner_login.lower() == me:
                continue
            row = repos.setdefault(repo["nameWithOwner"], {
                "repo": repo["nameWithOwner"], "url": repo.get("url") or "",
                "owner": owner_login, "is_org": owner.get("__typename") == "Organization",
                "stars": repo.get("stargazerCount") or 0,
                "commits": 0, "pull_requests": 0, "issues": 0, "reviews": 0,
            })
            row[field] += count(item)

    nodes = lambda item: (item.get("contributions") or {}).get("nodes") or []
    total = lambda item: (item.get("contributions") or {}).get("totalCount") or 0
    add(cc.get("commitContributionsByRepository"), "commits", lambda i: sum(n.get("commitCount") or 0 for n in nodes(i)))
    add(cc.get("pullRequestContributionsByRepository"), "pull_requests", total)
    add(cc.get("issueContributionsByRepository"), "issues", total)
    add(cc.get("pullRequestReviewContributionsByRepository"), "reviews", total)

    rows = [r for r in repos.values() if r["commits"] + r["pull_requests"] + r["issues"] + r["reviews"] > 0]
    rows.sort(key=lambda r: (-(r["commits"] + r["pull_requests"] + r["issues"] + r["reviews"]), r["repo"]))
    return rows[:MAX_EXTERNAL_REPOS]


def _streaks(days: list[dict]) -> tuple[int, int]:
    longest = run = 0
    for d in days:
        run = run + 1 if d["count"] > 0 else 0
        longest = max(longest, run)
    current = 0
    for i, d in enumerate(reversed(days)):
        if d["count"] > 0:
            current += 1
        elif i == 0:
            continue  # today may not have activity yet
        else:
            break
    return current, longest


def _summarize_event(e: dict) -> dict | None:
    t, p = e.get("type"), e.get("payload", {})
    repo = e.get("repo", {}).get("name", "")
    if t == "PushEvent":
        text = f"Pushed to {p.get('ref', '').removeprefix('refs/heads/')}"
    elif t == "PullRequestEvent":
        pr = p.get("pull_request", {})
        verb = "Merged" if pr.get("merged") else p.get("action", "").capitalize()
        text = f"{verb} PR: {pr.get('title', '')}"
    elif t == "IssuesEvent":
        text = f"{p.get('action', '').capitalize()} issue: {p.get('issue', {}).get('title', '')}"
    elif t == "CreateEvent":
        text = f"Created {p.get('ref_type', '')} {p.get('ref') or ''}".strip()
    elif t == "WatchEvent":
        text = "Starred"
    elif t == "ForkEvent":
        text = "Forked"
    else:
        return None
    return {
        "type": t,
        "repo": repo,
        "text": text,
        "at": e.get("created_at", ""),
        "url": f"https://github.com/{repo}",
    }


async def _fetch_events(access_token: str, username: str) -> list[dict] | None:
    """Public events only (never leaks private repo names).
    Returns None on failure so the caller keeps the previous cached activity.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.github.com/users/{username}/events/public",
                params={"per_page": 50},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
    except httpx.HTTPError:
        return None
    if resp.status_code != 200:
        return None
    return [i for i in map(_summarize_event, resp.json()) if i][:10]


async def fetch_and_cache_stats(user: User, db: Session) -> GithubStatsCache:
    """Fetches fresh GitHub stats for `user` using their stored access token.
    Updates and returns the GithubStatsCache row. Raises GithubTokenInvalid
    if the token is rejected — caller should catch this and fall back to
    serving stale cached data instead of erroring the whole page.
    """
    if not user.encrypted_github_token:
        raise GithubTokenInvalid("No stored GitHub token")
    try:
        access_token = decrypt_token(user.encrypted_github_token)
        response, events = await asyncio.gather(
            _run_graphql_query(access_token, user.github_username),
            _fetch_events(access_token, user.github_username),
        )
    except (InvalidToken, httpx.HTTPError) as exc:
        # key rotated / GitHub unreachable or slow: callers already degrade to the stale cache
        raise GithubTokenInvalid(f"GitHub fetch failed: {type(exc).__name__}") from exc

    if response.status_code != 200:
        raise GithubTokenInvalid(
            f"GitHub API call failed with status {response.status_code}"
        )

    data = response.json() or {}
    gh_user = (data.get("data") or {}).get("user")
    if gh_user is None:
        logger.warning("Unexpected GraphQL response for %s: %s", user.github_username, data)
        raise GithubTokenInvalid(f"Unexpected GraphQL response: {data}")

    cc = gh_user["contributionsCollection"]
    total_contributions = cc["contributionCalendar"]["totalContributions"]

    repos = gh_user["repositories"]["nodes"]
    languages = [r["primaryLanguage"]["name"] for r in repos if r.get("primaryLanguage")]
    top_languages = sorted(set(languages), key=languages.count, reverse=True)[:5]

    pinned = [
        {
            "name": r["name"],
            "description": r.get("description"),
            "stars": r["stargazerCount"],
            "url": r["url"],
        }
        for r in gh_user.get("pinnedItems", {}).get("nodes", [])
    ]

    weeks = [
        [{"date": d["date"], "count": d["contributionCount"]} for d in w["contributionDays"]]
        for w in cc["contributionCalendar"]["weeks"]
    ]
    current_streak, longest_streak = _streaks([d for w in weeks for d in w])

    owned = gh_user["ownedRepos"]
    extra = {
        "commits": cc["totalCommitContributions"],
        "pull_requests": cc["totalPullRequestContributions"],
        "issues": cc["totalIssueContributions"],
        "reviews": cc["totalPullRequestReviewContributions"],
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "followers": gh_user["followers"]["totalCount"],
        "public_repos": owned["totalCount"],
        "total_stars": sum(r["stargazerCount"] for r in owned["nodes"]),  # first 100 repos only
        "prs_all_time": gh_user["pullRequests"]["totalCount"],
        "joined": gh_user["createdAt"][:10],
    }

    cache = db.exec(
        select(GithubStatsCache).where(GithubStatsCache.user_id == user.id)
    ).first()
    if cache is None:
        cache = GithubStatsCache(user_id=user.id)

    cache.total_contributions = total_contributions
    cache.top_languages_json = json.dumps(top_languages)
    cache.pinned_repos_json = json.dumps(pinned)
    cache.calendar_json = json.dumps(weeks)
    cache.extra_stats_json = json.dumps(extra)
    cache.external_json = json.dumps(summarize_external(cc, user.github_username))
    if events is not None:
        cache.activity_json = json.dumps(events)
    cache.last_fetched_at = utc_now()

    db.add(cache)
    db.commit()
    db.refresh(cache)
    return cache


def is_stale(cache: GithubStatsCache | None) -> bool:
    if cache is None:
        return True

    age = utc_now() - as_utc(cache.last_fetched_at)
    return age.total_seconds() > STALE_AFTER_HOURS * 3600


async def refresh_stats_in_background(user_id: int, db_engine=None) -> None:
    """Refresh a user's cached stats AFTER the response has been sent.

    Uses its own DB session (the request's session is closed by then). If GitHub or the stored
    token fails, bump last_fetched_at as a back-off so a revoked token isn't retried on every view.
    """
    from app.database import engine

    with Session(db_engine or engine) as db:
        user = db.get(User, user_id)
        if user is None:
            return
        try:
            await fetch_and_cache_stats(user, db)
        except GithubTokenInvalid:
            cache = db.exec(select(GithubStatsCache).where(GithubStatsCache.user_id == user_id)).first()
            if cache:
                cache.last_fetched_at = utc_now()
                db.add(cache)
                db.commit()
