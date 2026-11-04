# Phase 7 UI transformation

Verified locally on November 4, 2026, starting from updated `origin/main`
at `084cf8a`. The working tree was clean before creating `feat/ui-overhaul`.
This phase changes the React experience and frontend checks. Backend contracts,
authentication, trusted validation, sandbox policy, native import/readback,
deployment configuration, and frozen evaluations are unchanged.

## Experience

The application opens with a roughly three-second assembly of Proof Shelf's
three geometric elements. It can be skipped, runs once per tab session, and is
omitted for reduced motion. Its timer is presentation timing, not loading or job
progress. The application becomes interactive even if WebGL cannot initialize.

A spacious introductory composition leads into an operator studio with four
stages: source files, review and confirmation, rehearsal and verification, and
verified release. Source previews, distinct-column selection, explicit consent,
and optional experimental interpretation remain visible decisions. Changing a
mapping, normalization rule, or intent clears consent. The model proposal cannot
authorize execution. Manual mapping remains the default.

Queued/running views show indeterminate activity and actual backend state. They
do not invent percentages or granular staging milestones. Partial results show
verified exports and unresolved source rows separately. Failure exposes neither
downloads nor stale verified tables. Reports retain SKU and decimal strings.
Confirmed jobs can be restored within the same tab session using only their ID;
raw uploads are not copied to browser storage. A transient restoration outage
preserves that reference and blocks an unchecked replacement job.

## Brand and rendering

The canonical `brand/` package remains unchanged. Predev/prebuild copy its SVGs,
font and license to ignored `web/public/brand/`. Production copies were compared
byte-for-byte with canonical sources. Navigation uses the compact horizontal
lockup without a tagline; favicon variants and self-hosted Inter are included.

Three.js supplies the assembly, perspective hero, pointer depth, and desktop
workflow illustration. Its shapes use the exact approved planar shelf paths;
extrusion and lighting illustrate the identity rather than replace its SVG
masters. These decorative scenes are explicitly distinct from verification.

Rendering is bounded to pixel ratio 1.5 and 30 FPS. Static scenes stop rendering
after settling; pointer/state changes wake them briefly. Offscreen scenes and
hidden documents pause. Renderer, geometry, materials, observers and listeners
are disposed on unmount. Only one scene mounts at a time; the hidden mobile
sidebar does not create a renderer. There are no external textures or effects
pipelines. Canvas resizes repaint immediately, avoiding an idle blank buffer.
Reduced motion skips the dynamic Three.js import and uses the approved SVG.
Unavailable/lost WebGL retains the same SVG and all functional controls.

Final build sizes: application JS **226.51 kB / 71.45 kB gzip**, lazy Three.js
chunk **753.31 kB / 192.54 kB gzip**, CSS **36.37 kB / 8.71 kB gzip**. Vite's
500 kB chunk warning remains visible. Lazy loading and bounded rendering reduce
the impact, but this is not a measured low-end-device performance certification.

## Real local integration evidence

The two existing browser journeys passed with the redesigned page, real Vultr
`qwen3.8-27b`, a separate local worker, the isolated Docker sandbox, native
WooCommerce import, independent SQL readback, and store destruction. Their API,
model, sandbox, and store calls were not intercepted.

| Journey | Verified outcome | Real inference evidence |
| --- | --- | --- |
| Standard mappings | 3 supplier rows = 2 verified + 1 unknown SKU held; downloaded CSV and report | `chatcmpl-5fc6022b-f038-4d7e-96b9-287109153a44`, 790 tokens, 1 transformation attempt |
| Explicit supplier interpretation | Human-reviewed unfamiliar columns; 2/2 rows verified, no unresolved rows | Interpretation `chatcmpl-66ce8c53-e9a1-4058-979c-a04dc999bb39`, 841 tokens; transformation `chatcmpl-440dedec-decc-495f-8222-703574972e79`, 1,549 tokens, 1 attempt |

SQL readback in both reports retained `00017`, price `13.5500`, stock `7`, and
name `Leading zero product`; `A-2` retained price `1.35`, stock `2`, and name
`Decimal product`. The unknown SKU was excluded from the partial CSV. Reports
state `Native import and independent SQL readback passed; store destroyed`.
Subsequent Docker queries found no containers or volumes with compose project
label `shelfready-feasibility`. These are regression journeys, not new competitive
benchmark results or evidence of agent superiority.

Ignored local evidence: `artifacts/rehearsal/{report.json,verified.csv,browser.png}`,
`artifacts/spike-browser/{report.json,reviewed.png}`, and visual inspections under
`artifacts/ui-overhaul/`. Reproduction may replace these artifacts. They are not
Git deliverables or public demo data.

## Checks and reproduction

Use the existing Python environment, Docker images/setup, and ignored Vultr
credentials described in the earlier phase documentation. Run Python/store and
real browser suites sequentially: they share a disposable compose project.
The local browser configuration uses loopback ports 18765/18766 and a separate
`.runtime/ui-browser` queue. It starts API/Vite; real rehearsal tests also start
and stop the separate worker. Stop an existing preview before running tests.

```powershell
.venv/Scripts/python.exe -m pytest -q --basetemp=.runtime/pytest-ui-overhaul
.venv/Scripts/python.exe -m ruff check .
Push-Location web
npm ci
npm run test:e2e
npm run build
npm run format:check
npm audit --audit-level=moderate
Pop-Location
node scripts/validate_brand.mjs
git diff --check
.venv/Scripts/python.exe -m shelfready.credential_scan
```

For inference-free frontend regressions only, run
`npm run test:e2e -- ui.spec.ts` from `web/`. Those tests explicitly use synthetic
network fixtures for safety/state checks; they do not claim live integrations.

Observed checks:

- **117 Python tests passed in 91.21 seconds**; one existing Starlette/AnyIO
  deprecation warning. Ruff passed.
- **2 real local browser journeys passed**. After final motion/accessibility
  work, **8 frontend browser tests passed in 41.7 seconds**: session intro,
  skip, reduced motion, unavailable WebGL, actual nonempty WebGL pixels, context
  loss, consent reset, duplicate mapping rejection, no false exports on failure,
  partial accounting, session restoration and outage recovery.
- Automated axe WCAG A/AA scans found **zero violations** on the landing,
  mapping, and partial-result surfaces. This does not replace a manual assistive
  technology audit.
- Browser screenshots were inspected at **320, 390, 768 and 1440px**. All had
  document scroll width equal to viewport width. WebGL rendered at 320/768/1440;
  the 390px reduced-motion check created zero canvases. Desktop inspection had
  no page errors; refreshing did not replay the intro.
- Strict TypeScript/Vite production build and pinned Prettier check passed.
  npm audit returned **zero vulnerabilities**, using the OS certificate trust
  store where the local Node trust configuration initially rejected the audit
  certificate. TLS verification was not disabled.
- All **17 locked SVGs** passed brand checks: names, transparency, nonempty
  rendering, native favicon notch, light/dark contrast, local fonts and links.
  The validator now handles the manifest's original CRLF serialization alongside
  Git's LF SVG checkout and waits for responsive picture source selection.
  Artwork and approved hashes were not changed.
- Whitespace and tracked-file known-secret/private-key scans passed. The secret
  scan is deliberately described as bounded, not an exhaustive security audit.

## Limits

This is local Chromium verification on Windows, including emulated viewports
and browser WebGL. Physical low-end phones, Safari/iOS, Firefox, screen readers,
and slow-network loading have not been certified. Public authentication and
HTTPS were not re-deployed or re-tested in this UI phase; their existing backend
controls and deployment settings were preserved. No infrastructure was created,
opened or modified. Existing VM billing obligations remain unchanged.

The public demo still accepts only its existing allowlisted synthetic pair;
fixture downloads use the existing production build script. This UI adds no
capability to upload arbitrary public inputs. Previous findings about experimental
agent value remain unchanged. No README animation, video, or Phase 8 work is included.
