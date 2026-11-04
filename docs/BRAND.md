# ShelfReady brand identity

**Locked direction: Concept A — Proof Shelf.** Final visual approval granted
November 4, 2026. Concepts B and C are rejected. These are the approved production
source assets; raster explorations and proof screenshots remain ignored artifacts.
The original Phase 6.5 package did not wire assets into the application. Phase 7
now copies these unchanged sources into the frontend's build output; see
[UI integration and verification](ui-overhaul.md). Package-only statements below
describe the original brand delivery, not the current application integration.

ShelfReady rehearses and independently verifies supplier catalog updates before
release. The three shelves suggest successive controlled stages. The rectangular
notch is a precise verification slot, not a shopping-cart, box or shield symbol.
The mark was constructed as original vector geometry rather than traced from
the generated concept image.

## Asset package

Canonical source: [brand manifest](../brand/manifest.json). All SVGs have transparent
backgrounds and outlined lettering. They need no fonts, scripts, external images
or network requests to render. `light` means **for a light surface**; `dark` means
**for a dark surface**, not the color of the lettering.

| Application | Light surface | Dark surface | Tagline |
|---|---|---|---|
| Primary stacked lockup | [primary-light.svg](../brand/primary-light.svg) | [primary-dark.svg](../brand/primary-dark.svg) | Yes |
| Compact horizontal lockup / navbar | [horizontal-light.svg](../brand/horizontal-light.svg) | [horizontal-dark.svg](../brand/horizontal-dark.svg) | **No** |
| Wordmark only | [wordmark-light.svg](../brand/wordmark-light.svg) | [wordmark-dark.svg](../brand/wordmark-dark.svg) | No |
| Icon only | [icon-light.svg](../brand/icon-light.svg) | [icon-dark.svg](../brand/icon-dark.svg) | **No** |
| Large horizontal signature | [signature-light.svg](../brand/signature-light.svg) | [signature-dark.svg](../brand/signature-dark.svg) | Yes |
| 16px optical favicon | [favicon-16-light.svg](../brand/favicon-16-light.svg) | [favicon-16-dark.svg](../brand/favicon-16-dark.svg) | **No** |
| 24px favicon | [favicon-24-light.svg](../brand/favicon-24-light.svg) | [favicon-24-dark.svg](../brand/favicon-24-dark.svg) | **No** |
| 32px favicon | [favicon-32-light.svg](../brand/favicon-32-light.svg) | [favicon-32-dark.svg](../brand/favicon-32-dark.svg) | **No** |

Use [icon-monochrome.svg](../brand/icon-monochrome.svg) for single-ink reproduction.
The exact tagline is **Rehearse. Verify. Release.** Keep the capitalization,
punctuation and order. Never add it to a favicon, compact navbar or small icon.

The [static asset proof](../brand/preview.html) shows every variant, actual-size
favicons, and illustrative navbar placements. Its labels are not interactive
product controls. It can be opened locally or served with the validation command
below; it is not a redesigned application or a public endpoint.

## Geometry and spacing

The master icon uses a 96 × 96 coordinate canvas. Shelf thickness is 16 units;
vertical gaps are 12 units; successive shelves shift 8 units. Each sloped end
uses an 8-unit horizontal shift across 16 vertical units, a consistent 1:2 slope.
The middle notch is a 12 × 8 rectangular cutout. Preserve the exact approved
paths, optical position and silhouette. Do not round corners, alter the notch,
add strokes, gradients, shadows, outlines or a background tile.

Provide at least 24 units of external clear space per 96-unit icon canvas
(one quarter of its displayed size). This is additional space outside the SVG
canvas, not a reason to edit its viewBox. The approved horizontal lockup already
contains its internal mark-to-wordmark spacing; do not reassemble it by eye.

- Navbar: use the tagline-free horizontal lockup. The approved desktop proof is
  **167.625 × 36px**, with a compact **149 × 32px** option. Retain aspect ratio.
- Icon: use the master at 32px and above; choose the dedicated favicon files
  at 16/24/32px. The 16px design has the approved optical simplification so the
  slot stays visible. Do not enlarge that micro variant as a hero mark.
- Primary stacked lockup: use at least 300px wide when retaining its tagline.
  Large horizontal signature: use at least 360px wide. Below these sizes, switch
  to the compact horizontal lockup; do not force a tiny tagline.
- Wordmark: use at least 140px wide. Do not stretch, recolor individual letters,
  change case, replace lettering with live text, or alter optical spacing.

## Color and typography

| Token | Value | Approved use |
|---|---|---|
| Cobalt | `#164BFF` | Top shelf on white/light surfaces; primary brand accent |
| Navy | `#102044` | Shelves and wordmark on white/light surfaces |
| Dark surface | `#0A1530` | Approved dark presentation background |
| Inverse ink | `#F1F5FF` | Shelves and wordmark on the dark surface |
| Inverse cobalt | `#6C8CFF` | Approved cobalt tonal adjustment on dark surfaces |
| Light surface | `#FFFFFF` | Approved light presentation background |

Use [tokens.css](../brand/tokens.css) as an opt-in reference for future UI work.
It declares colors, font family/weights and sizing guidance, but is not imported
into the current application. Brand accent colors do not replace semantic
success, warning or error states. Avoid placing the light-surface variant on
navy or the inverse variant on white.

The wordmark is outlined **Inter**, optical size 32, weight 640, with manually
adjusted pair spacing. The f/R junction remains deliberately open. The tagline
uses outlined weight 450 with additional tracking. Keep these outlines as the
logo; setting “ShelfReady” in ordinary text does not reproduce its spacing.

For supporting typography, the package provides [Inter variable WOFF2](../brand/fonts/Inter-variable.woff2)
and its [SIL Open Font License](../brand/fonts/OFL.txt). The CSS family is
`ShelfReady Inter`, followed by system fallbacks; body weight 400, labels 500,
headings 600. The font is self-hosted when this optional stylesheet is used;
no third-party font service is required. The license/attribution must accompany
font redistribution. The original source was the [official Google Fonts Inter
directory](https://github.com/google/fonts/tree/main/ofl/inter); source and packaged
font hashes are recorded in the manifest. App typography is unchanged here.

## Accessibility and asset references

All SVGs declare `role="img"` and a nonempty title referenced by
`aria-labelledby`. Primary/large signatures name the tagline; compact assets
name ShelfReady alone. For normal web use, prefer an external image with an
appropriate accessible name:

```html
<!-- Example only: adapt the path to the eventual asset deployment location. -->
<a href="/" aria-label="ShelfReady home">
  <img src="/brand/horizontal-light.svg" width="149" height="32" alt="ShelfReady">
</a>
```

This change does **not** publish `/brand/` or modify the application's HTML.
If visible adjacent text already names the product, a decorative icon should
use `alt=""`; an icon-only link still needs an accessible link name. Do not
rely on the inner SVG title to supply the `alt` of an external HTML image.
If inlining more than one SVG, prefix the title IDs and matching
`aria-labelledby` values per instance to avoid duplicate IDs.

The mark remains recognizable without color: a single-ink master is provided.
Contrast is checked for the approved light/dark pairs. Brand/logo text itself
has a [WCAG contrast exception](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
but the package checks all four foreground pairs
against a 4.5:1 threshold anyway. This is a focused asset check, not an accessibility
audit of the application or a guarantee for arbitrary background colors.

## Validation and preservation

From the repository root, with the existing locked frontend dependencies and
Playwright Chromium installed:

```powershell
node scripts/validate_brand.mjs
git diff --check
.venv/Scripts/python.exe -m shelfready.credential_scan
```

The validator serves **only allowlisted brand files** on an ephemeral loopback
port and closes the server/browser afterwards. It checks:

- Exact approved hashes for all 17 SVGs and the packaged font.
- SVG XML, image role/title and absence of scripts, embedded images, live fonts
  or external/active references.
- Actual browser rendering, nonempty pixels and transparent corner/background
  pixels for every variant, with no opaque background shapes.
- Native favicon dimensions and an open transparent notch at 16/24/32px.
- Tagline exclusion from compact assets, image alternative text in the proof,
  successful local font loading, foreground contrast, and asset/document links.

Desktop/mobile proof screenshots and measured results are written only to
ignored `artifacts/brand/production-validation/`. The manifest hashes preserve
the user-approved artwork; edits require deliberate review and a corresponding
approval/hash update. The original concept board and review PNGs are not shipped.

Final package verification on November 4, 2026 passed all 17 SVG checks,
accessible naming, transparency, local asset/font loading, desktop/mobile
rendering and compact tagline exclusion. Measured contrast: navy/white **16.00:1**,
cobalt/white **6.03:1**, inverse ink/dark **16.55:1**, inverse cobalt/dark **5.88:1**.
The existing TypeScript/Vite production build, Ruff, whitespace and tracked-file
credential checks also passed. Application source and workflows are unchanged.
