# DevAtlas UI/UX & Design System Plan

> **Phase 2 — awaiting approval before implementation.**

---

## Audit Summary

### What's Working Well
- **Theme architecture foundation**: `data-theme` attribute switching with FOUC prevention via inline script + cookie/localStorage. Three complete themes (terminal, coffee, forest) with extensive token coverage.
- **Server/client separation**: Clean Next.js App Router patterns. Auto-recovery polling for sleeping backends is clever.
- **Typography**: Fonts chosen well — Space Grotesk (display), Outfit (body), JetBrains Mono. Not generic.
- **Visual identity**: The app has a warm, editorial, non-corporate feel. Cards, banners, contribution graphs, game wishlist — it's clearly not a LinkedIn clone.
- **Reduced motion**: `@media (prefers-reduced-motion)` is already in `globals.css`.
- **`color-mix()`**: Used throughout for subtle tints and dynamic borders — modern, clean.
- **Profile page**: Discord-inspired layout with identity card + board tabs is strong. Mock data module (`profile-mock.ts`) is well-documented.

### What Needs Work

| Area | Issue |
|---|---|
| **Theme system** | Themes are hardcoded in 3 places (inline script, ThemeSwitcher, `color-scheme` rule in globals.css). No manifest, no registry, no contributor workflow, no validation. Adding a theme means editing multiple files. |
| **Token gaps** | No spacing scale tokens, no typography scale tokens. Components use arbitrary rem values (`0.42rem`, `0.72rem`, `0.55rem`). |
| **Icon inconsistency** | Zero icon libraries. Mix of inline SVGs, SVG path dictionaries, unicode (`×`, `⌄`, `←`, `↗`), and text labels. No consistent size, stroke weight, or semantic choice. |
| **ThemeSwitcher** | Styles live in `globals.css` (not a module). No palette preview from manifest data. No keyboard arrow navigation. Swatch colors are hardcoded hex. |
| **LoginModal** | z-index is `10` (below nav at `20`). No focus trap, no Escape key, no backdrop click-to-close. No border-radius (breaks visual system). No entry animation. |
| **ProfileNav** | Owner menu has no outside-click dismissal. `!important` x4 in mobile layout. SVG path map recreated every render. |
| **Dead code** | `page.module.css` is orphaned (page.tsx just redirects). Contains hardcoded `#2563eb`. |
| **Duplicated top bar** | Directory page and profile page each render their own nearly-identical top bar with brand, theme switcher, nav links, and avatar. Not a shared shell. |
| **No app shell** | No persistent navigation. Footer is duplicated on directory and profile pages. |
| **Directory** | No loading skeleton. Empty state is a plain text paragraph. No card entrance stagger beyond first 3. |
| **Static pages** | `StaticPage` component uses a unicode `←` back arrow. No breadcrumb, no consistent page chrome. |
| **Metadata** | Missing OpenGraph, Twitter cards, viewport, themeColor. |
| **No toast system** | Success/error feedback uses `window.alert()` or `window.confirm()`. |
| **Responsive** | Breakpoints are hardcoded magic numbers (`900px`, `980px`, `760px`, `720px`, `1100px`). Not unified. |

---

## Plan

### HIGH Impact

#### 1. Theme Architecture (new `frontend/src/themes/` system)
- Create `frontend/src/themes/` with:
  - `_template/theme.css` + `_template/manifest.ts` (commented, all tokens, example values)
  - `terminal/theme.css` + `terminal/manifest.ts` (extract from current `themes.css`)
  - `coffee/theme.css` + `coffee/manifest.ts`
  - `forest/theme.css` + `forest/manifest.ts`
  - `registry.ts` — typed explicit registry. Exports `THEMES` array, `getTheme(id)`, `DEFAULT_THEME_ID`.
  - `types.ts` — `ThemeManifest` type (id, name, description, author, version, preview colors, builtIn flag, optional: license, repository, authorUrl, tags)
  - `validate.ts` — dev-time script: checks all registered themes for missing tokens, malformed manifests, WCAG AA contrast on primary text vs background and accent vs background.
  - `README.md` — contributor guide (copy template, required tokens, manifest, register, preview, test, PR, criteria).
- Migrate existing `themes.css` content into per-theme `theme.css` files.
- Semantic token contract: `--background`, `--foreground`, `--card-bg`, `--card-raised`, `--foreground-muted`, `--foreground-dimmed`, `--border`, `--border-muted`, `--hairline`, `--highlight`, `--input-bg`, `--input-border`, `--primary`, `--primary-foreground`, `--secondary-bg`, `--secondary-fg`, `--accent-bg`, `--accent-fg`, `--danger`, `--online`, `--surface-pattern`, `--control-radius`, `--card-radius`, `--shell-radius`, `--inner-radius`, `--shadow-card`, `--shadow-lift`, `--glow`. (Keep existing token names — they're already consistent and well-adopted across components.)
- Persistence: Keep existing cookie + localStorage + inline script approach (it works and prevents FOUC). Update the inline script to read from the registry's exported theme IDs list. Fall back to `terminal` if stored id is missing/invalid.

#### 2. App Shell & Navigation
- Create a shared `AppShell` component used by both directory and profile pages:
  - Persistent sticky top bar: brand, theme switcher, directory link, user avatar (or login).
  - Persistent footer: github, contribute, report-issue, about, privacy, rules.
- Remove the duplicated top bar and footer from `directory/page.tsx` and `[username]/page.tsx`.
- The shell does NOT wrap the mod panel (it has its own shell already).
- Mobile: add a hamburger/menu icon that opens a slide-out or dropdown with nav links (currently `/Directory` is hidden on mobile, leaving only the tiny theme icon and avatar).

#### 3. Profile Page Polish
- Replace inline SVG path dictionaries in `ProfileNav` with Lucide React icons.
- Fix ProfileNav owner menu: add outside-click dismissal and Escape key handler.
- Remove `!important` flags from ProfileNav mobile CSS (restructure selectors).
- SVG path map: move to module scope (not re-created per render).
- Add copy-profile-link button (clipboard API + toast).
- Consistent section headings.

#### 4. Directory Page Polish
- Add loading skeleton for directory cards (skeleton-to-content transition).
- Better empty state: icon + descriptive text + suggested action.
- Extend card entrance stagger to all visible cards (not just first 3).
- Replace bare `<a>` cards with `<Link>` for client-side navigation.

#### 5. Theme Switcher & Manager
- **Switcher** (lightweight, in top bar):
  - Move styles from `globals.css` to `ThemeSwitcher.module.css`.
  - Show palette preview swatch from manifest `previewColors`.
  - Add keyboard arrow navigation.
  - Remove hardcoded swatch hex values; derive from registry.
  - Link to "Manage themes" (future manager view).
- **Theme Manager** (separate `/settings/themes` page or modal):
  - Lists all registered themes.
  - Shows preview, name, author, description, version, active status, Use/Remove actions.
  - Built-in themes: not removable.
  - Optional/community themes: removable (per-user hide stored in localStorage). Requires confirmation, undoable (restore).
  - Removing active theme switches to default first.
  - App never left without a valid theme.

---

### MEDIUM Impact

#### 6. LoginModal Fixes
- Fix z-index to use `var(--z-modal)`.
- Add focus trap (manual or simple custom hook; no new dependency).
- Add Escape key handler.
- Add backdrop click-to-close.
- Add border-radius using `var(--card-radius)`.
- Add entry/exit animation.
- Add GitHub icon to the CTA button.
- Don't navigate to `/directory` on close; use `router.back()` or just close the modal overlay.

#### 7. Icons — Lucide React
- Install `lucide-react` (the only new dependency; justified because the app currently has zero icon library and uses a fragmented mix of unicode, inline SVGs, and text).
- Replace all unicode/text icons with Lucide:
  - `×` close buttons → `X`
  - `⌄` chevrons → `ChevronDown`
  - `←` back arrows → `ArrowLeft`
  - `↗` external links → `ExternalLink`
  - ProfileNav SVG paths → `User`, `Github`, `Activity`/`Flame`, `Gamepad2`, `Settings`, `Sparkles`
  - ThemeSwitcher palette icon → `Palette`
  - Search icon for directory → `Search`
  - Edit buttons → `Pencil`
  - Menu hamburger → `Menu`
  - Report → `Flag`
  - Moderation → `ShieldCheck`
  - Refresh → `RefreshCw`
- Standard: 20px size, 1.5px stroke weight (matches Lucide defaults), `currentColor`.

#### 8. Motion System
- Define motion tokens in CSS:
  ```css
  --duration-fast: 150ms;
  --duration: 280ms; /* already exists */
  --duration-slow: 500ms;
  --ease: cubic-bezier(0.32, 0.72, 0, 1); /* already exists */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  ```
- Micro-interactions:
  - Nav item hover/active (already partially done — extend).
  - Theme switch: color crossfade (CSS `transition` on `background`, `color`, `border-color` on `body` and cards).
  - Card hover lift (already done on directory — ensure consistency).
  - Button press: `scale(0.98)` (already partially done — standardize).
  - Dropdown/modal: `menuIn` keyframe (already exists — apply consistently to LoginModal).
  - Tab transitions.
  - Page entrance: `riseIn` (already exists — ensure all main content uses it).
  - Skeleton-to-content fade.
  - Toast entrance/exit.
- All wrapped in `@media (prefers-reduced-motion: reduce)` (already global — verified).

#### 9. Empty / Loading / Error States
- Directory: skeleton grid → content.
- Profile sections: empty state with icon + message (not just "Nothing added yet." text).
- `WakeUpLoader`: wire up the `onRetry` prop in `error.tsx` (currently missing).
- Error boundary: show the actual error type, not just the generic wake-up loader.

#### 10. Toast System
- Lightweight toast component: positioned bottom-right, auto-dismiss after 4s, supports success/error/info.
- Replace `window.confirm()` for logout with a proper confirmation dialog or inline action.
- Use for: copy profile link, theme switch feedback, form save success, error messages.

---

### LOW Impact

#### 11. Cosmetic Consistency
- Add spacing scale tokens to `themes.css`:
  ```css
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  ```
  (Not migrating all existing components to use these — that's a future pass. Just make them available.)
- Add typography scale tokens similarly (available, not enforced on every component).
- Unify breakpoint values as CSS custom properties or at least document them.
- Clean up dead code: remove orphaned `page.module.css`.
- Fix `page.module.css` hardcoded `#2563eb` (though it's dead code, remove it).
- Add OpenGraph and Twitter card metadata to `layout.tsx`.
- Add `<a href="#main" className="srOnly">Skip to content</a>` in layout.

#### 12. Responsive Pass
- Verify mobile nav, profile, directory, cards, settings, theme manager, modals, dropdowns, tabs, and touch targets at `375px`, `390px`, `768px`, `1024px`, `1440px`.
- Ensure all interactive elements have minimum 44px touch targets.
- Directory controls: verify they stack cleanly on mobile (they do with `grid-template-columns: 1fr` at 760px).

---

## Proposed Theme Package Structure

```
frontend/src/themes/
  types.ts              # ThemeManifest type definition
  registry.ts           # Explicit typed registry; exports THEMES, getTheme(), DEFAULT_THEME_ID
  validate.ts           # Dev-time validation script (missing tokens, contrast check)
  README.md             # Contributor guide
  _template/
    theme.css           # All tokens with comments and example values
    manifest.ts         # Commented manifest with all fields
  terminal/
    theme.css           # Terminal theme tokens (extracted from current themes.css)
    manifest.ts         # { id: 'terminal', name: 'Terminal', builtIn: true, ... }
  coffee/
    theme.css
    manifest.ts
  forest/
    theme.css
    manifest.ts
```

---

## Scope Flags

> [!WARNING]
> ### Items intentionally deferred (too large for this pass)
> - **Refactoring `EditProfileModal`**: The audit found it monolithic (~500 lines handling all edit sections). Splitting it into per-section forms is a meaningful refactor but doesn't change visible UX in this pass.
> - **Full spacing/typography migration**: Adding token variables is in scope; migrating every component's arbitrary rem values to use them is not.
> - **WAI-ARIA compliant listbox/menu**: The ThemeSwitcher and ProfileNav menus will get outside-click, Escape, and basic arrow key navigation. Full APG compliance (aria-activedescendant, roving tabindex) is deferred.
> - **OpenGraph images**: Adding metadata tags is in scope; generating dynamic OG images per profile is not.
> - **i18n**: Not in scope.
> - **Profile page layout restructure**: The Discord-inspired two-column layout is kept as-is. It works.

---

## New Dependency

| Package | Justification |
|---|---|
| `lucide-react` | The app has zero icon library. Icons are currently a fragmented mix of inline SVGs with inconsistent viewBoxes, unicode characters (`×`, `⌄`, `←`), and CSS pseudo-element hacks. Lucide is tree-shakeable (only imported icons ship), has consistent 24x24 viewBox and stroke weight, and is the most common React SVG icon system. |

No other new dependencies.

---

## Implementation Order

1. Theme architecture (`types.ts`, registry, per-theme files, validation, README)
2. Global semantic tokens (spacing, typography, motion tokens in root CSS)
3. App shell and navigation (shared component, remove duplication)
4. Icons (install Lucide, replace unicode/inline SVGs)
5. Profile and directory polish (skeletons, empty states, copy link, section consistency)
6. Theme switcher refactor + theme manager page
7. Motion standardization
8. LoginModal fixes, toast system, secondary polish
9. Responsive verification pass
10. Lint, typecheck, build verification

---

## Placeholder/Mock Data

All placeholder data is already isolated in [`frontend/src/lib/profile-mock.ts`](file:///d:/Programming/Projects/devatlas/frontend/src/lib/profile-mock.ts). It provides:
- `bannerUrl()` — generates Picsum banner images per username
- `pronounsFor()` — deterministic mock pronouns
- `statusFor()` — mock status bubble text
- `presenceFor()` — always returns "online"

Each usage in `[username]/page.tsx` is marked with `// MOCK:` comments explaining what to replace when the backend adds the field. **No changes needed to this module.** I will not add any new mock data.

The directory page also uses `bannerUrl()` from this module for card banners, marked with `// MOCK:`.
