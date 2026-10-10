# DevAtlas fix (replaces the previous zip's page/shell files)

Cause of the broken layout: your app already has `[username]/layout.tsx` (top bar, rail, sidebar,
footer). My first zip added a second shell (ProfileFrame) inside it and replaced your rail, so
your sidebar fell into the old 64px rail column. This version works WITH your layout.

## 1. Delete these files (from my first zip)
frontend/src/app/components/ProfileFrame.tsx
frontend/src/app/components/ProfileFrame.module.css
frontend/src/app/components/ProfileCard.tsx
frontend/src/app/components/ProfileCard.module.css
frontend/src/app/components/Panel.tsx
frontend/src/app/components/Panel.module.css
frontend/src/app/components/SectionPlaceholder.tsx
frontend/src/app/components/SectionPlaceholder.module.css
frontend/src/app/components/ExpandableTags.tsx
frontend/src/app/components/ProfileEditButton.module.css
frontend/src/app/[username]/page.module.css

## 2. Copy every file in this zip over your repo.

## 3. Check one file against git
`[username]/page.tsx` was overwritten by my first zip, so I rebuilt it from your tab components
(Overview / Activity / Interests, plus "In common" for non-owners). If your original had
different tab rules, restore it with `git checkout <your-commit> -- "frontend/src/app/[username]/page.tsx"`
and keep only what you need.

What changed: layout.tsx mounts the settings modal once (fixes the vanishing window), 2-column grid
with a wider 380px profile card, notch nav fixed to the left edge (bottom on mobile), owner-only badge in
the footer, banner + gears in the sidebar, equal-height cards, Overview rearrange, and subpages
rebuilt on your Card/SubpageHeader.
