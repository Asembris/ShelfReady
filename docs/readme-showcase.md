# README showcase

The README describes the merged application and the dated live observations in
[the deployment record](live-deployment.md). It does not rerun or rescore a frozen
evaluation. The only application URL it publishes is the existing invited demo;
credentials, host inventory, raw operational artifacts and new endpoints are absent.

## Art direction: Proofline

[The original banner](assets/readme-hero.svg) is an authored 1280 × 360 SVG. Its
navy/cobalt palette, diagonal 1:2 cuts and exact outlined Proof Shelf lockup come
from the [approved brand](BRAND.md). Supporting text uses system font fallbacks;
the wordmark itself cannot change with font availability.

The complete six-step workflow is legible in the first frame. A small signal
travels the line, pauses at explicit human approval, then passes isolated execution,
native import and independent SQL comparison before the release highlight. A
12-second cycle leaves breathing room and fades the signal before its return.
All motion is decorative CSS over a complete static poster. Reduced-motion
removes every animation; an animation-less renderer still receives the poster.
The illustration never claims to be a running job or measured progress.

The banner contains no scripts, SMIL, embedded images, external fonts, external
references or runtime dependencies. README text supplies the same workflow when
the image is unavailable or too small to read on a phone. It does not alter the
frontend's three-second intro or application design.

## Reference study

Read both READMEs and their actual SVG sources before authoring:

- [Tarmac](https://github.com/edycutjong/tarmac), including
  [`docs/readme-hero.svg`](https://github.com/edycutjong/tarmac/blob/main/docs/readme-hero.svg):
  useful evidence hierarchy and a visible causal mechanism. Its numerous SMIL
  timelines and initially hidden copy were not adopted.
- [Loci](https://github.com/edycutjong/loci), including
  [`docs/assets/readme-hero-animated.svg`](https://github.com/edycutjong/loci/blob/main/docs/assets/readme-hero-animated.svg):
  useful story beats, a readable poster, and quiet loop reset. Its room/photo
  composition, assets, lighting mechanism and SMIL animations were not reused.

Source inspection found no scripts or external asset loads in those banners.
ShelfReady uses CSS-only motion so its media-query fallback controls every moving
element, rather than stopping CSS while leaving SMIL active. No third-party
source, image or design was copied into this asset.

The first authoring/render checks found and corrected a Windows text-encoding
error and an SVG-vs-HTML style-injection error in the test harness. Chromium's
per-context reduced-motion emulation stopped the standalone SVG but did not reach
the embedded SVG image in the observed build. The validator therefore also uses
Chromium's [browser-level preference override](https://chromium.googlesource.com/chromium/src/+/HEAD/ui/gfx/switches.cc)
for the embedded-image test. It retains exact pixel equality for stillness and
loop seams. The static-versus-composited poster comparison permits less than
1/255 average channel difference for observed text antialiasing, rather than
treating changed font antialiasing as missing content. Other browser engines
are not certified by this check.

## Reproduce validation

Install the locked frontend dependencies and Playwright Chromium, then run from
the repository root:

```sh
node scripts/validate_showcase.mjs
node scripts/validate_brand.mjs
git diff --check
```

The showcase validator checks XML, accessible naming, internal references, exact
embedded lockup paths, absence of active/external content, text bounds, local
README links, browser frames, loop seam, no-animation poster, image embedding and
reduced-motion stillness. It serves only the banner and its small preview on an
ephemeral loopback port and closes the server/browser afterward. Proof captures
remain ignored. The existing offline-safe web CI job also runs this validator
and formatting checks, with no new dependencies or permissions. GitHub rendering and final check results are recorded
after inspection; compilation alone does not establish visual quality.

## Observed verification — November 5, 2026

- **SVG:** 17,413 bytes; valid XML and internal references; the three embedded
  approved lockup paths match exactly. Six decorative CSS timelines share one
  12-second cycle. Seven sampled frames demonstrate the story and an exact
  first/last pixel match. Static/reduced-motion posters retain the full story;
  two-second stillness checks pass in standalone and embedded-image modes.
- **GitHub:** its rendered-README endpoint returned HTTP 200, retaining the image,
  setup disclosure and Mermaid block. The branch's raw image returned HTTP 200
  with `image/svg+xml`; downloaded bytes match the authored SVG exactly. Private
  raw-download capabilities were not published or logged.
- **Visual inspection:** storyboard frames and 896/390px image embedding were
  inspected. GitHub-rendered HTML was inspected at desktop light/dark and 390px
  mobile widths in a **local styled preview**, using the exact GitHub-served
  image. This is not a claim to have inspected GitHub's logged-in page chrome or
  client-side Mermaid rendering. At phone size, the banner is an overview; the
  equivalent workflow remains readable in the README text and image description.
- **Repository:** 128 Python tests passed in 114.90 seconds, including the 10
  local Docker/native tests; 17 portable browser tests passed in 36.5 seconds.
  Production TypeScript/Vite build, frontend/showcase formatting, all 17 locked
  brand-asset checks, Ruff and whitespace checks passed. Existing upstream
  deprecation and lazy-world chunk-size warnings remain.
- **Hosted:** [CI](https://github.com/Asembris/ShelfReady/actions/runs/42018646366)
  and [Security](https://github.com/Asembris/ShelfReady/actions/runs/42018646436)
  succeeded on the initial README integration revision. The Linux CI run includes
  the new image-mode/reduced-motion validator and documentation formatting;
  Security includes dependency audits and full-history redacted Gitleaks.

No real inference request, cloud deployment or evaluation rerun was performed for
this documentation change. The README's live evidence remains the dated merged
deployment record. Application, approved brand sources, private operational
artifacts and frozen evaluations were not changed. Final publication is a branch
push for owner review, with no PR or merge.
