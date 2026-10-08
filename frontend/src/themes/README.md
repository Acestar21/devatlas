# DevAtlas themes

Themes are repo-committed CSS files paired with typed manifests. They are not loaded from users, remote URLs, or a marketplace.

To add a theme:

1. Copy `_template/` into a new directory.
2. Keep every semantic token in `types.ts`.
3. Add a manifest with stable preview colors and `builtIn: false` only for an optional repo-committed theme.
4. Register the manifest in `registry.ts`.
5. Import the theme stylesheet from `src/app/themes.css`.
6. Run `npm run typecheck` and review the theme in both light and dark system preferences where applicable.

Components consume semantic tokens only. They must not branch on a theme id.
