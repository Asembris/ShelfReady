"""Build the README hero and call-to-action buttons from approved brand sources.

Large type is outlined from the packaged Inter font so it cannot change with the
viewer's fonts. The lockup paths are copied verbatim from brand/horizontal-dark.svg.
These build-only tools are deliberately not application dependencies:

    uv run --no-project --with fonttools --with brotli --with uharfbuzz \
        python scripts/build_readme_hero.py
"""

from __future__ import annotations

import io
import re
from functools import lru_cache
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "brand/fonts/Inter-variable.woff2"
LOCKUP = ROOT / "brand/horizontal-dark.svg"
OUT = ROOT / "docs/assets"

WIDTH, HEIGHT = 1280, 640
CYCLE_MS = 14000

# Shelf geometry follows the mark: 1:2 sloped ends, and each shelf starts where the
# previous one's sloped end finished. The motif is not the logo; the lockup stays exact.
SHELF_H = 138
PITCH = 160
TOPS = (112, 272, 432)
LEFTS = (250, 181, 112)
SLOPE = SHELF_H // 2
LIP = 9
BLEED = WIDTH + 80
SLOT_X0, SLOT_X1, SLOT_H = 872, 976, 62
SLOT_CX = (SLOT_X0 + SLOT_X1) // 2

INK = "#F1F5FF"
MUTED = "#B4C2E2"
DIM = "#9AAED8"
COBALT = "#164BFF"
INVERSE_COBALT = "#6C8CFF"
PERIWINKLE = "#A8BBFF"
MINT = "#8DE3BF"
SURFACE = "#0A1530"
DEEP = "#060D20"
NAVY = "#102044"


def number(value: float) -> str:
    text = f"{value:.1f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


@lru_cache
def font_instance(weight: int, optical: int) -> tuple[TTFont, hb.Font]:
    variable = TTFont(FONT)
    static = instantiateVariableFont(variable, {"wght": weight, "opsz": optical})
    static.flavor = None
    buffer = io.BytesIO()
    static.save(buffer)
    data = buffer.getvalue()
    return TTFont(io.BytesIO(data)), hb.Font(hb.Face(hb.Blob(data)))


def outline(
    text: str,
    x: float,
    y: float,
    size: float,
    weight: int = 560,
    optical: int = 28,
    track: float = 0,
    features: dict[str, bool] | None = None,
    anchor: str = "start",
) -> tuple[str, float]:
    """Shape text with kerning and return its SVG outline and advance width."""
    font, shaper = font_instance(weight, optical)
    scale = size / font["head"].unitsPerEm
    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    hb.shape(shaper, buffer, {"kern": True, **(features or {})})
    tracking = track * size
    width = sum(p.x_advance * scale + tracking for p in buffer.glyph_positions)
    width -= tracking
    pen_x = x - width if anchor == "end" else x - width / 2 if anchor == "middle" else x
    glyphs = font.getGlyphSet()
    pen = SVGPathPen(glyphs, ntos=number)
    for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
        name = font.getGlyphName(info.codepoint)
        glyphs[name].draw(
            TransformPen(
                pen,
                (
                    scale,
                    0,
                    0,
                    -scale,
                    pen_x + position.x_offset * scale,
                    y - position.y_offset * scale,
                ),
            )
        )
        pen_x += position.x_advance * scale + tracking
    return pen.getCommands(), width


def shelf(index: int, notch: bool = False) -> str:
    top, left = TOPS[index], LEFTS[index]
    bottom = top + SHELF_H
    foot = left - SLOPE
    if notch:
        lower = (
            f"H{SLOT_X1}V{bottom - SLOT_H}H{SLOT_X0}V{bottom}"  # verification slot
        )
        return f"M{left} {top}H{BLEED}V{bottom}{lower}H{foot}Z"
    return f"M{left} {top}H{BLEED}V{bottom}H{foot}Z"


def lip(index: int, notch: bool = False) -> str:
    top, left = TOPS[index], LEFTS[index]
    bottom = top + SHELF_H
    foot = left - SLOPE
    drop = bottom + LIP
    if notch:
        return (
            f"M{foot} {bottom}H{SLOT_X0}V{drop}H{foot - LIP // 2}Z"
            f"M{SLOT_X1} {bottom}H{BLEED}V{drop}H{SLOT_X1}Z"
        )
    return f"M{foot} {bottom}H{BLEED}V{drop}H{foot - LIP // 2}Z"


def label(x: float, y: float, text: str, fill: str = MUTED) -> str:
    return f'<text x="{x}" y="{y}" class="cap" fill="{fill}">{text}</text>'


def file_icon(x: float, y: float, stroke: str, fill: str) -> str:
    return (
        f'<path d="M{x} {y}H{x + 20}L{x + 32} {y + 24}V{y + 44}H{x}Z" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="1.5"/>'
        f'<path d="M{x + 20} {y}V{y + 24}H{x + 32}" fill="none" stroke="{stroke}" '
        f'stroke-opacity=".6" stroke-width="1.5"/>'
    )


def keyframes(name: str, stops: str) -> str:
    return f"@keyframes {name} {{ {stops} }}"


def build_hero() -> str:
    lockup = "".join(re.findall(r"<path [^>]+/>", LOCKUP.read_text(encoding="utf-8")))

    word = dict(weight=640, optical=32, track=-0.022)
    rehearse, _ = outline("Rehearse.", 264, TOPS[0] + 100, 88, **word)
    verify, _ = outline("Verify.", 195, TOPS[1] + 100, 88, **word)
    release, _ = outline("Release.", 126, TOPS[2] + 100, 88, **word)

    tabular = {"tnum": True, "zero": True}
    value = dict(size=34, weight=560, optical=28, features=tabular)
    row1 = TOPS[0] + 92
    sku, _ = outline("00017", 700, row1, **value)
    old_price, w1 = outline("12.30", 842, row1, **value)
    arrow, w2 = outline("→", 842 + w1 + 12, row1, 28, weight=500, optical=28)
    new_x = 842 + w1 + w2 + 24
    new_price, new_w = outline("13.55", new_x, row1, **value)
    old_stock, w3 = outline("4", 1110, row1, **value)
    stock_arrow, w4 = outline("→", 1110 + w3 + 12, row1, 28, weight=500, optical=28)
    new_stock_x = 1110 + w3 + w4 + 24
    new_stock, _ = outline("7", new_stock_x, row1, **value)

    row2 = TOPS[1] + 92
    expected, exp_w = outline("13.55 / 7", 700, row2, **value)
    persisted, per_w = outline("13.55 / 7", 1012, row2, **value)
    equals, _ = outline(
        "=", SLOT_CX, TOPS[1] + 58, 54, weight=500, optical=32, anchor="middle"
    )
    check_x = 1012 + per_w + 18
    check = f"m{number(check_x)} {row2 - 12} 8 9 16-20"

    row3 = TOPS[2] + 82
    csv, csv_w = outline("Verified CSV", 744, row3, 30, weight=600, optical=28)
    report, _ = outline("Change report", 1042, row3, 30, weight=560, optical=28)
    csv_check = f"m{number(744 + csv_w + 14)} {row3 - 10} 7 8 14-18"

    css = f"""
text{{font-family:Inter,'Segoe UI',system-ui,-apple-system,Arial,sans-serif}}
.cap{{font-size:14px;font-weight:600;letter-spacing:2px}}
.motion{{opacity:0}}
@media (prefers-reduced-motion:no-preference){{
.motion{{animation-duration:{CYCLE_MS}ms;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.45,.05,.25,1)}}
.pop{{transform-box:fill-box;transform-origin:center}}
.v1{{animation-name:v1}}.v2{{animation-name:v2}}.v3{{animation-name:v3}}
.token{{animation-name:token}}
.r1{{animation-name:r1}}.r2{{animation-name:r2}}.r3{{animation-name:r3}}
.s1{{animation-name:s1}}.s3{{animation-name:s3}}
.price{{animation-name:price}}.stock{{animation-name:stock}}
.match{{animation-name:match}}.compare{{animation-name:compare}}
.beam{{animation-name:beam}}.mark{{animation-name:mark}}
.burst{{animation-name:burst}}
}}
@media (prefers-reduced-motion:reduce){{.motion{{animation:none!important;opacity:0!important}}}}
"""
    motion = "\n".join(
        [
            keyframes("v1", "0%,30%{opacity:0}36%,84%{opacity:.62}92%,100%{opacity:0}"),
            keyframes(
                "v2",
                "0%,5%{opacity:0}10%,30%{opacity:.62}36%,56%{opacity:0}"
                "62%,84%{opacity:.62}92%,100%{opacity:0}",
            ),
            keyframes("v3", "0%,5%{opacity:0}10%,54%{opacity:.62}60%,100%{opacity:0}"),
            keyframes(
                "token",
                f"0%,7%{{opacity:0;transform:translate({LEFTS[0]}px,{TOPS[0]}px)}}"
                f"9%{{opacity:1;transform:translate({LEFTS[0]}px,{TOPS[0]}px)}}"
                f"30%{{opacity:1;transform:translate(1300px,{TOPS[0]}px)}}"
                f"31%,33%{{opacity:0;transform:translate(1300px,{TOPS[1]}px)}}"
                f"34%{{opacity:1;transform:translate(1300px,{TOPS[1]}px)}}"
                f"44%,51%{{opacity:1;transform:translate({SLOT_CX}px,{TOPS[1]}px)}}"
                f"58%{{opacity:1;transform:translate({SLOT_CX}px,{TOPS[2]}px)}}"
                f"72%{{opacity:1;transform:translate(1300px,{TOPS[2]}px)}}"
                f"73%,100%{{opacity:0;transform:translate(1300px,{TOPS[2]}px)}}",
            ),
            keyframes(
                "r1",
                "0%,8%{opacity:0;stroke-dashoffset:1030}"
                "9%{opacity:1;stroke-dashoffset:1030}"
                "30%{opacity:1;stroke-dashoffset:0}"
                "36%,100%{opacity:0;stroke-dashoffset:0}",
            ),
            keyframes(
                "r2",
                "0%,33%{opacity:0;stroke-dashoffset:356}"
                "34%{opacity:1;stroke-dashoffset:356}"
                "44%,54%{opacity:1;stroke-dashoffset:0}"
                "60%,100%{opacity:0;stroke-dashoffset:0}",
            ),
            keyframes(
                "r3",
                "0%,57%{opacity:0;stroke-dashoffset:356}"
                "58%{opacity:1;stroke-dashoffset:356}"
                "72%,82%{opacity:1;stroke-dashoffset:0}"
                "90%,100%{opacity:0;stroke-dashoffset:0}",
            ),
            keyframes(
                "s1",
                "0%,10%{opacity:0;transform:translateX(-260px)}"
                "13%{opacity:.3;transform:translateX(0)}"
                "30%{opacity:.3;transform:translateX(1160px)}"
                "33%,100%{opacity:0;transform:translateX(1160px)}",
            ),
            keyframes(
                "s3",
                "0%,58%{opacity:0;transform:translateX(0)}"
                "61%{opacity:.3;transform:translateX(120px)}"
                "76%{opacity:.3;transform:translateX(1160px)}"
                "79%,100%{opacity:0;transform:translateX(1160px)}",
            ),
            keyframes("price", "0%,17%{opacity:0}21%,29%{opacity:1}34%,100%{opacity:0}"),
            keyframes("stock", "0%,21%{opacity:0}25%,29%{opacity:1}34%,100%{opacity:0}"),
            keyframes(
                "match",
                "0%,43%{opacity:0;transform:scale(.8)}"
                "47%,54%{opacity:1;transform:scale(1)}"
                "60%,100%{opacity:0;transform:scale(1)}",
            ),
            keyframes("compare", "0%,40%{opacity:0}45%,54%{opacity:1}60%,100%{opacity:0}"),
            keyframes("beam", "0%,50%{opacity:0}54%,58%{opacity:1}64%,100%{opacity:0}"),
            keyframes(
                "mark",
                "0%,60%{opacity:0;transform:scale(.6)}"
                "65%,82%{opacity:1;transform:scale(1)}"
                "90%,100%{opacity:0;transform:scale(1)}",
            ),
            keyframes("burst", "0%,62%{opacity:0}74%,80%{opacity:1}92%,100%{opacity:0}"),
        ]
    )

    plate = f"M0 0H1248L{WIDTH} 64V{HEIGHT}H32L0 {HEIGHT - 64}Z"
    hairlines = "".join(
        f"M{x} 0 {x - HEIGHT // 2} {HEIGHT}" for x in range(420, 1760, 170)
    )
    sweep = f"M0 {{y}}H80L{-SLOPE + 80} {{b}}H{-SLOPE}Z"

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="sr-title sr-description">
  <title id="sr-title">ShelfReady — Rehearse. Verify. Release.</title>
  <desc id="sr-description">An illustrated workflow, not live job status. Three shelves carry one synthetic row from the November 5, 2026 run. Rehearse: SKU 00017 changes price from 12.30 to 13.55 and stock from 4 to 7 in a disposable store. Verify: the expected values equal the values persisted, read independently with SQL. Release: only then do the verified CSV and change report unlock. Everything is visible without animation.</desc>
  <!-- Generated by scripts/build_readme_hero.py; edit the generator, not this file.
       Proof Shelf: a {CYCLE_MS / 1000:g}-second storyboard over a complete static poster.
       0-30% rehearse; 34-58% compare, then fall through the verification slot;
       58-84% release; 84-100% return to the poster. Only overlays animate.
       No scripts, SMIL, images, font loads or external references. -->
  <defs>
    <linearGradient id="sr-ground" x2="1" y2="1"><stop stop-color="{DEEP}"/><stop offset=".55" stop-color="{SURFACE}"/><stop offset="1" stop-color="{DEEP}"/></linearGradient>
    <radialGradient id="sr-light"><stop stop-color="{COBALT}" stop-opacity=".34"/><stop offset="1" stop-color="{COBALT}" stop-opacity="0"/></radialGradient>
    <radialGradient id="sr-mint-light"><stop stop-color="{MINT}" stop-opacity=".42"/><stop offset="1" stop-color="{MINT}" stop-opacity="0"/></radialGradient>
    <radialGradient id="sr-halo"><stop stop-color="#FFF"/><stop offset=".22" stop-color="{PERIWINKLE}" stop-opacity=".75"/><stop offset="1" stop-color="{INVERSE_COBALT}" stop-opacity="0"/></radialGradient>
    <linearGradient id="sr-shelf-1" x2="1" y2=".12"><stop stop-color="#2E5BFF"/><stop offset=".46" stop-color="#1A3AAE"/><stop offset="1" stop-color="#0F2160"/></linearGradient>
    <linearGradient id="sr-shelf-2" x2="1" y2=".12"><stop stop-color="#20386E"/><stop offset=".5" stop-color="#14264F"/><stop offset="1" stop-color="#0D1B39"/></linearGradient>
    <linearGradient id="sr-shelf-3" x2="1" y2=".12"><stop stop-color="#14514B"/><stop offset=".5" stop-color="#0F3A3C"/><stop offset="1" stop-color="#0B2530"/></linearGradient>
    <linearGradient id="sr-edge-1"><stop stop-color="#C9D6FF"/><stop offset="1" stop-color="{INVERSE_COBALT}" stop-opacity=".35"/></linearGradient>
    <linearGradient id="sr-edge-2"><stop stop-color="{PERIWINKLE}" stop-opacity=".8"/><stop offset="1" stop-color="{INVERSE_COBALT}" stop-opacity=".22"/></linearGradient>
    <linearGradient id="sr-edge-3"><stop stop-color="{MINT}"/><stop offset="1" stop-color="{MINT}" stop-opacity=".3"/></linearGradient>
    <linearGradient id="sr-sweep"><stop stop-color="#FFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFF" stop-opacity=".5"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></linearGradient>
    <linearGradient id="sr-beam" x2="0" y2="1"><stop stop-color="{MINT}" stop-opacity=".1"/><stop offset=".7" stop-color="{MINT}" stop-opacity=".5"/><stop offset="1" stop-color="#E8FFF5" stop-opacity=".7"/></linearGradient>
    <linearGradient id="sr-slot" x2="0" y2="1"><stop stop-color="#040A1A"/><stop offset=".3" stop-color="#061A26"/><stop offset="1" stop-color="#14514B"/></linearGradient>
    <linearGradient id="sr-gloss" x2="0" y2="1"><stop stop-color="#FFF" stop-opacity=".055"/><stop offset=".42" stop-color="#FFF" stop-opacity="0"/></linearGradient>
    <clipPath id="sr-plate"><path d="{plate}"/></clipPath>
    <clipPath id="sr-clip-1"><path d="{shelf(0)}"/></clipPath>
    <clipPath id="sr-clip-3"><path d="{shelf(2)}"/></clipPath>
    <style>{css}{motion}
</style>
  </defs>
  <g clip-path="url(#sr-plate)">
    <path d="M0 0H{WIDTH}V{HEIGHT}H0Z" fill="url(#sr-ground)"/>
    <ellipse cx="1010" cy="300" rx="640" ry="420" fill="url(#sr-light)"/>
    <path d="{hairlines}" fill="none" stroke="{INVERSE_COBALT}" stroke-opacity=".05"/>

    <g id="sr-approved-lockup" transform="translate(48 24) scale(.5)" aria-hidden="true">
      {lockup}
    </g>
    <text x="1200" y="54" text-anchor="end" class="cap" fill="{DIM}">SUPPLIER CATALOG UPDATES FOR WOOCOMMERCE</text>

    <path d="M{SLOT_X0} {TOPS[1] + SHELF_H - SLOT_H}H{SLOT_X1}V{TOPS[2]}H{SLOT_X0}Z" fill="url(#sr-slot)"/>
    <path class="motion beam" d="M{SLOT_X0} {TOPS[1] + SHELF_H - SLOT_H}H{SLOT_X1}V{TOPS[2]}H{SLOT_X0}Z" fill="url(#sr-beam)"/>

    <path d="{lip(0)}" fill="#0A1A52"/>
    <path d="{lip(1, notch=True)}" fill="#0A1530"/>
    <path d="{lip(2)}" fill="#082026"/>
    <path d="{shelf(0)}" fill="url(#sr-shelf-1)"/>
    <path d="{shelf(1, notch=True)}" fill="url(#sr-shelf-2)"/>
    <path d="{shelf(2)}" fill="url(#sr-shelf-3)"/>
    <path d="{shelf(0)}{shelf(2)}" fill="url(#sr-gloss)"/>
    <path d="{shelf(1, notch=True)}" fill="url(#sr-gloss)"/>
    <path d="M{LEFTS[0]} {TOPS[0]}.75H{WIDTH}" fill="none" stroke="url(#sr-edge-1)" stroke-width="1.5"/>
    <path d="M{LEFTS[1]} {TOPS[1]}.75H{WIDTH}" fill="none" stroke="url(#sr-edge-2)" stroke-width="1.5"/>
    <path d="M{LEFTS[2]} {TOPS[2]}.75H{WIDTH}" fill="none" stroke="url(#sr-edge-3)" stroke-width="1.5"/>
    <path d="M{SLOT_X0} {TOPS[1] + SHELF_H - SLOT_H}.75H{SLOT_X1}" fill="none" stroke="{MINT}" stroke-width="1.5" stroke-opacity=".8"/>

    <g clip-path="url(#sr-clip-1)"><path class="motion s1" d="{sweep.format(y=TOPS[0], b=TOPS[0] + SHELF_H)}" fill="url(#sr-sweep)"/></g>
    <g clip-path="url(#sr-clip-3)"><ellipse class="motion burst" cx="1280" cy="{TOPS[2] + SHELF_H // 2}" rx="520" ry="150" fill="url(#sr-mint-light)"/><path class="motion s3" d="{sweep.format(y=TOPS[2], b=TOPS[2] + SHELF_H)}" fill="url(#sr-sweep)"/></g>

    <path d="{rehearse}" fill="#FFF"/>
    <path d="{verify}" fill="{INK}"/>
    <path d="{release}" fill="{INK}"/>

    <g>
      {label(700, TOPS[0] + 50, "SKU", "#C9D6FF")}{label(842, TOPS[0] + 50, "PRICE", "#C9D6FF")}{label(1110, TOPS[0] + 50, "STOCK", "#C9D6FF")}
      <path d="{sku}" fill="{INK}"/>
      <path d="{old_price}{old_stock}" fill="#A9BBEE"/>
      <path d="{arrow}{stock_arrow}" fill="{PERIWINKLE}"/>
      <path d="{new_price}{new_stock}" fill="#FFF"/>
    </g>
    <g>
      {label(700, TOPS[1] + 50, "EXPECTED")}{label(1012, TOPS[1] + 50, "PERSISTED, READ BY SQL")}
      <path d="{expected}{persisted}" fill="{INK}"/>
      <path d="{equals}" fill="{PERIWINKLE}"/>
      <path d="{check}" fill="none" stroke="{MINT}" stroke-width="3.5"/>
    </g>
    <g>
      {file_icon(700, TOPS[2] + 48, MINT, "#0F4A44")}
      <path d="{csv}" fill="{MINT}"/>
      <path d="{csv_check}" fill="none" stroke="{MINT}" stroke-width="3.5"/>
      {file_icon(998, TOPS[2] + 48, MINT, "#0F4A44")}
      <path d="{report}" fill="{INK}"/>
    </g>

    <path class="motion v1" d="{shelf(0)}" fill="{DEEP}"/>
    <path class="motion v2" d="{shelf(1, notch=True)}" fill="{DEEP}"/>
    <path class="motion v3" d="{shelf(2)}" fill="{DEEP}"/>

    <ellipse class="motion price" cx="{number(new_x + new_w / 2)}" cy="{row1 - 12}" rx="88" ry="46" fill="url(#sr-light)"/>
    <path class="motion price" d="{new_price}" fill="#FFF"/>
    <ellipse class="motion stock" cx="{number(new_stock_x + 10)}" cy="{row1 - 12}" rx="56" ry="46" fill="url(#sr-light)"/>
    <path class="motion stock" d="{new_stock}" fill="#FFF"/>
    <ellipse class="motion compare" cx="{number(700 + exp_w / 2)}" cy="{row2 - 12}" rx="120" ry="44" fill="url(#sr-mint-light)"/>
    <ellipse class="motion compare" cx="{number(1012 + per_w / 2)}" cy="{row2 - 12}" rx="120" ry="44" fill="url(#sr-mint-light)"/>
    <path class="motion compare" d="{expected}{persisted}" fill="#FFF"/>
    <ellipse class="motion compare" cx="{SLOT_CX}" cy="{TOPS[1] + 42}" rx="70" ry="44" fill="url(#sr-mint-light)"/>
    <path class="motion match pop" d="{equals}" fill="{MINT}"/>
    <path class="motion match pop" d="{check}" fill="none" stroke="#C8F5E0" stroke-width="4"/>
    <path class="motion mark pop" d="{csv_check}" fill="none" stroke="#C8F5E0" stroke-width="4"/>

    <path class="motion r1" d="M{LEFTS[0]} {TOPS[0]}.75H{WIDTH}" fill="none" stroke="#FFF" stroke-width="2.5" stroke-dasharray="1030"/>
    <path class="motion r2" d="M{WIDTH} {TOPS[1]}.75H{SLOT_CX}" fill="none" stroke="#FFF" stroke-width="2.5" stroke-dasharray="356"/>
    <path class="motion r3" d="M{SLOT_CX} {TOPS[2]}.75H{WIDTH}" fill="none" stroke="#C8F5E0" stroke-width="2.5" stroke-dasharray="356"/>
    <g class="motion token"><ellipse rx="64" ry="30" fill="url(#sr-halo)"/><path d="M-9 -3H11L8 3H-12Z" fill="#FFF"/></g>

    <text x="48" y="614" font-size="16" fill="{MUTED}">The model writes the transformation. It cannot authorize a change or certify its own result.</text>
    <text x="1232" y="614" text-anchor="end" class="cap" fill="{DIM}">ILLUSTRATION · SYNTHETIC DATA</text>
  </g>
</svg>
"""


def build_button(title: str, primary: bool) -> str:
    height, slope, size = 56, 28, 21
    d, text_w = outline(title, 0, 0, size, weight=600, optical=24)
    pad = 26
    width = round(text_w + 2 * pad + slope)
    text, _ = outline(title, slope / 2 + pad, height / 2 + size * 0.36, size, weight=600, optical=24)
    fill = COBALT if primary else NAVY
    edge = "#6C8CFF" if primary else "#5B74B8"
    shape = f"M{slope} .75H{width - .75}L{width - slope} {height - .75}H.75Z"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">
  <title id="title">{title}</title>
  <!-- Generated by scripts/build_readme_hero.py; edit the generator, not this file. -->
  <path d="{shape}" fill="{fill}" stroke="{edge}" stroke-width="1.5"/>
  <path d="{text}" fill="{'#FFF' if primary else INK}"/>
</svg>
"""


def main() -> None:
    outputs = {
        "readme-hero.svg": build_hero(),
        "readme-cta-demo.svg": build_button("Open the public demo", True),
        "readme-cta-evidence.svg": build_button("See the live evidence", False),
        "readme-cta-local.svg": build_button("Run it locally", False),
    }
    for name, content in outputs.items():
        (OUT / name).write_text(content, encoding="utf-8", newline="\n")
        print(f"{name}: {len(content.encode('utf-8'))} bytes")


if __name__ == "__main__":
    main()
