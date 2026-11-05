# README showcase

The README describes the merged application and the dated live observations in
[the deployment record](live-deployment.md). It does not rerun or rescore a frozen
evaluation. The only application URL it publishes is the existing invited demo;
credentials, host inventory, raw operational artifacts and new endpoints are absent.

## Art direction: three shelves

[The banner](assets/readme-hero.svg) is an authored 1280 × 640 SVG built around one
idea: the brand tagline, **Rehearse. Verify. Release.**, set large on three shelves.
The shelves borrow the mark's construction: 1:2 sloped ends, each shelf starting
where the last one's slope finished, and a rectangular verification slot cut from
the middle shelf's lower edge. They are an illustration motif, not the logo. The
approved lockup appears separately with its exact, unmodified paths.

The content is one synthetic row from the November 5 run, matching
[the fixtures](../fixtures/update.csv): SKU `00017`, price `12.30 → 13.55`, stock
`4 → 7`. Expected values sit either side of the slot and equal the persisted values,
and only the path through that slot reaches the release shelf. Mint is reserved for
that verified state. The banner labels itself an illustration with synthetic data
and never claims to be a running job or measured progress.

A spotlight moves down the shelves over a 14-second cycle while a signal runs along
each top edge, waits at the comparison, drops through the slot and leaves with the
released files. All motion is decorative CSS over a complete static poster.
Reduced-motion removes every animation; an animation-less renderer still receives
the poster. At phone width the three words stay readable; finer detail becomes an
overview, and the README text and image description carry the same workflow.

The banner contains no scripts, SMIL, embedded images, external fonts, external
references or runtime dependencies. It does not alter the frontend's three-second
intro or application design.

## Buttons and badges

The three header buttons are small static SVGs sharing the hero's slanted geometry.
Status badges use GitHub's own workflow `badge.svg`, which needs no third-party
service and reflects real runs on `main`. Everything else is a static
[Shields](https://shields.io) badge in the brand navy, rather than a mix of vendor
colors.

Static badges cannot update themselves. The test and live-journey numbers restate
dated results from [the deployment record](live-deployment.md); change them when
that record changes.

## Regenerating the artwork

The large type is outlined from the [packaged Inter font](../brand/fonts/OFL.txt),
so it does not change with the viewer's fonts. Small labels stay live text with
system fallbacks. Edit [the generator](../scripts/build_readme_hero.py), not the
SVGs. Its build-only tools are not application dependencies:

```sh
uv run --no-project --with fonttools --with brotli --with uharfbuzz python scripts/build_readme_hero.py
```

## Reference study

Both reference READMEs were read before redesigning the header:
[Tarmac](https://github.com/edycutjong/tarmac) and
[Loci](https://github.com/edycutjong/loci). Their centered icon, heading, hero and
badge-row structure informed the layout. Their artwork, compositions and
multicolored badge rows were not reused, and no third-party source, image or design
was copied into these assets. An earlier study of their SVG sources led ShelfReady
to prefer CSS-only motion, so its media-query fallback controls every moving element.

Chromium's per-context reduced-motion emulation stopped the standalone SVG but did
not reach the embedded SVG image in the observed build. The validator therefore also
uses Chromium's
[browser-level preference override](https://chromium.googlesource.com/chromium/src/+/HEAD/ui/gfx/switches.cc)
for the embedded-image test. It retains exact pixel equality for stillness and loop
seams. The static-versus-composited poster comparison permits less than 1/255
average channel difference for observed text antialiasing. Other browser engines
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
README Markdown and HTML targets, inert buttons, browser frames, loop seam,
no-animation poster, image embedding and reduced-motion stillness. It serves only
the banner and its small preview on an ephemeral loopback port and closes the
server/browser afterward. Proof captures remain ignored. The existing offline-safe
web CI job also runs this validator and formatting checks, with no new dependencies
or permissions. Compilation alone does not establish visual quality.

## Observed verification — November 5, 2026

- **SVG:** 62,949 bytes; valid XML and internal references; the three embedded
  approved lockup paths match exactly. 22 decorative CSS timelines share one
  14-second cycle. Seven sampled frames demonstrate the story and an exact
  first/last pixel match. Static/reduced-motion posters retain the full story;
  two-second stillness checks pass in standalone and embedded-image modes.
- **Visual inspection:** storyboard frames were inspected. The README header was
  inspected at desktop light/dark and 390px widths in a **local styled preview**,
  with the banner animating inside an image element. This is not GitHub's own page.
- **Badges:** all 17 Shields URLs returned HTTP 200 and rendered in that preview.
  The two workflow badges returned HTTP 404 to anonymous requests because the
  repository is private, so their rendering is **not yet verified**. Their numbers
  were checked against the deployment record, not produced by a new test run.
- **Repository:** the showcase and brand validators, Ruff and whitespace checks
  passed. The Python and browser suites were not rerun for this documentation
  change, and no application code changed.
- **Hosted:** CI and Security have **not yet run** on this redesign, and it has not
  been inspected on GitHub. Earlier passing runs covered the previous banner.

No real inference request, cloud deployment or evaluation rerun was performed for
this documentation change. The README's live evidence remains the dated merged
deployment record. Application, approved brand sources, private operational
artifacts and frozen evaluations were not changed.
