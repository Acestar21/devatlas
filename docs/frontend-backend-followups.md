# Frontend mock data and backend follow-ups

This document records frontend behavior that currently uses generated, placeholder, or hardcoded data. It also lists the backend fields and API work needed before the UI can display real profile data.

## Profile chrome currently using mock data

### Profile and directory banners

Current frontend behavior:

- Profile banners use `bannerUrl(username)` from `frontend/src/lib/profile-mock.ts`.
- Directory cards use the same generated banner URL.
- The helper creates a `picsum.photos` URL from the username.

Backend work needed:

- Add an optional `banner_url` field to the profile response.
- Add an optional `banner_url` field to each directory result, or expose a common profile-card shape that includes it.
- Return `null` when no custom banner exists.
- The frontend should use the backend URL and keep a local fallback only when the field is absent.
- Decide whether the backend validates allowed image hosts, dimensions, file size, and deletion behavior.

Affected frontend:

- `frontend/src/lib/profile-mock.ts`
- `frontend/src/app/[username]/page.tsx`
- `frontend/src/app/directory/page.tsx`

### Pronouns

Current frontend behavior:

- The profile card currently displays the literal text `he/him`.
- It is not personalized and is not read from the profile response.

Backend work needed:

- Add an optional `pronouns` field to the profile response.
- Define accepted values and maximum length.
- Decide whether users can select from a fixed list, enter custom text, or use both.
- Add the field to the profile-edit request and persistence model.
- Return `null` when hidden or unset.

Affected frontend:

- `frontend/src/app/[username]/page.tsx`
- `frontend/src/types.ts`
- `frontend/src/lib/profile-mock.ts` can be deleted after migration.

### Presence / online indicator

Current frontend behavior:

- The profile presence indicator was removed from the visible profile card.
- The old mock helper `presenceFor()` remains in `frontend/src/lib/profile-mock.ts`, but is no longer used by the profile page.

Backend work needed only if presence is restored:

- Add a `presence` field with a defined enum such as `online`, `idle`, `dnd`, or `offline`.
- Define freshness and privacy rules.
- Do not infer presence from a page request unless that is an intentional product decision.

## Removed profile status

The profile status bubble was removed from the profile card. No backend replacement is currently required for this UI.

The old `statusFor()` helper remains only as unused legacy mock code and should be deleted once the repository cleanup pass is performed.

## Profile links

Current frontend behavior:

- Profile links are already read from `profile.content_links`.
- The links section is visually separated under a `Links` heading with an external-link marker.
- Existing links open in a new tab.

Backend work needed:

- Ensure the profile response always returns `content_links` as an array, including an empty array.
- Validate URL schemes server-side. Allow `https` and any explicitly supported safe schemes only.
- Return stable labels and URLs.
- Preserve the existing edit and visibility behavior.

No placeholder data is currently used for the displayed profile links.

## Game artwork

Current frontend behavior:

- Game cards call `gameArtUrl(game.name)` from `frontend/src/lib/game-art.ts`.
- The helper maps known game names to Steam CDN artwork URLs.
- Unknown games may render without artwork.
- The profile preview shows the top four games in horizontal cards, two per row.
- If there are more than four games, `View more` links to `/{username}/games`.

Backend work needed:

- Prefer returning a stable game identifier, platform, and optional `artwork_url` with each game entry.
- Avoid relying on display-name matching for artwork.
- Define whether artwork URLs are backend-owned, proxied, or allowed from a fixed external host.
- Keep `name`, `detail`, and `url` compatibility while adding the stable identifier.

Suggested game response shape:

```json
{
  "id": "steam:1091500",
  "name": "Cyberpunk 2077",
  "detail": "Steam",
  "url": "https://store.steampowered.com/app/1091500/",
  "artwork_url": "https://..."
}
```

Affected frontend:

- `frontend/src/types.ts`
- `frontend/src/lib/game-art.ts`
- `frontend/src/app/components/GameCard.tsx`
- `frontend/src/app/components/GamesPreview.tsx`
- `frontend/src/app/[username]/games/page.tsx`

## Mock and placeholder content still present

These are not necessarily backend bugs, but they should be replaced or intentionally retained before production:

- Profile banners use generated Picsum images.
- Empty stack text displays `Stack: Coming Soon`.
- Profile section placeholders display `Coming Soon`.
- Empty profile sections display text such as `Nothing added yet.`.
- The profile mock module still contains unused `pronounsFor()`, `statusFor()`, and `presenceFor()` helpers.
- `Post.image_url` is marked as reserved and is not currently used.

## Theme system requirements

Themes are repo-committed and currently defined in `frontend/src/themes/`. They do not require a backend marketplace or user-uploaded CSS.

If themes become user-selectable across devices, the backend would need:

- A user preference field such as `theme_id`.
- Validation against registered theme IDs.
- A safe fallback to `terminal` when a theme is removed or invalid.

The current frontend already persists the active theme client-side with localStorage and a cookie, so backend persistence is optional.

## UI-only changes that do not require backend work

The following changes are presentation or interaction changes only:

- Shared app shell and mobile navigation.
- Sticky profile identity card on desktop.
- Responsive profile board layout.
- Removal of the profile status bubble.
- Fixed `he/him` display until real pronoun data is available.
- Links heading and external-link marker.
- Four-game profile preview and games subpage navigation.
- Theme registry, theme tokens, and theme preview swatches.

## Recommended backend implementation order

1. Add `banner_url` to profile and directory-card responses.
2. Add persisted `pronouns` with edit and visibility rules.
3. Add stable game IDs and optional `artwork_url`.
4. Decide whether presence is a supported product feature.
5. Remove the remaining mock helper module and frontend fallback comments after the API migration.
