// Documentation-only check. No API, worker, Docker, cloud key or inference call.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "../web/node_modules/playwright/index.mjs";

const svg = await fs.readFile("docs/assets/readme-hero.svg", "utf8");
const brand = await fs.readFile("brand/horizontal-dark.svg", "utf8");
const readme = await fs.readFile("README.md", "utf8");
const sha = (b) => createHash("sha256").update(b).digest("hex");
assert.ok(
  Buffer.byteLength(svg) < 65536,
  "Keep the banner small and self-contained",
);
for (const match of readme.matchAll(/\]\(([^)]+)\)/g)) {
  const target = match[1];
  if (/^https?:/.test(target)) continue;
  const [file, fragment] = target.split("#");
  assert.ok(
    !/^(?:artifacts|\.runtime)\//.test(file),
    "No private artifacts in README",
  );
  const text = await fs.readFile(file || "README.md", "utf8");
  if (fragment) {
    const slugs = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) =>
      m[1]
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s/g, "-"),
    );
    assert.ok(slugs.includes(fragment), `Broken heading link: ${target}`);
  }
}
const preview = `<!doctype html><html lang="en"><meta charset="utf-8"><title>ShelfReady banner image-mode proof</title><style>body{margin:0;background:#fff}img{display:block;max-width:100%;height:auto}</style><img src="/hero.svg" width="1280" height="360" alt="ShelfReady's illustrated supplier-to-verified-release workflow">`;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/hero.svg") {
    res.writeHead(200, {
      "Content-Type": "image/svg+xml",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    });
    res.end(svg);
  } else if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(preview);
  } else if (pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const out = path.resolve("artifacts/readme-showcase");
await fs.mkdir(out, { recursive: true });
let browser, reducedBrowser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--force-prefers-no-reduced-motion"],
  });
  const compare = async (actual, expected) => {
    const probe = await browser.newPage();
    try {
      return await probe.evaluate(
        async (encoded) => {
          const pixels = [];
          for (const raw of encoded) {
            const img = new Image();
            img.src = "data:image/png;base64," + raw;
            await img.decode();
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            pixels.push(ctx.getImageData(0, 0, img.width, img.height).data);
          }
          let total = 0;
          for (let i = 0; i < pixels[0].length; i++)
            total += Math.abs(pixels[0][i] - pixels[1][i]);
          return total / pixels[0].length;
        },
        [actual.toString("base64"), expected.toString("base64")],
      );
    } finally {
      await probe.close();
    }
  };
  const page = await browser.newPage({
    viewport: { width: 1280, height: 360 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  const external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith(origin + "/")) external.push(r.url());
  });
  await page.goto(origin + "/hero.svg");
  const sourceChecks = await page.evaluate(
    ({ svg, brand }) => {
      const parse = (s) => new DOMParser().parseFromString(s, "image/svg+xml");
      const doc = parse(svg);
      if (doc.querySelector("parsererror")) throw Error("Invalid SVG XML");
      const root = doc.documentElement;
      if (
        root.getAttribute("viewBox") !== "0 0 1280 360" ||
        root.getAttribute("role") !== "img"
      )
        throw Error("Wrong banner dimensions/role");
      for (const id of root.getAttribute("aria-labelledby").split(" "))
        if (!doc.getElementById(id)?.textContent.trim())
          throw Error("Missing accessible name/description");
      const ids = new Set();
      const allowed = new Set([
        "svg",
        "title",
        "desc",
        "defs",
        "style",
        "linearGradient",
        "radialGradient",
        "stop",
        "clipPath",
        "g",
        "path",
        "ellipse",
        "circle",
        "text",
        "tspan",
      ]);
      for (const el of doc.querySelectorAll("*")) {
        if (!allowed.has(el.localName))
          throw Error("Unexpected SVG element: " + el.localName);
        if (el.id) {
          if (ids.has(el.id)) throw Error("Duplicate ID");
          ids.add(el.id);
        }
        for (const attr of el.attributes) {
          if (/^on/i.test(attr.name) || /href/i.test(attr.name))
            throw Error("Active/external reference");
          for (const m of attr.value.matchAll(/url\(([^)]+)\)/g))
            if (!m[1].startsWith("#") || !doc.getElementById(m[1].slice(1)))
              throw Error("Broken/external reference");
        }
      }
      const css = doc.querySelector("style").textContent;
      if (
        /@import|@font-face|url\(/i.test(css) ||
        !css.includes("prefers-reduced-motion")
      )
        throw Error("Unsafe CSS or missing motion fallback");
      const paths = (parent) =>
        [...parent.querySelectorAll("path")].map((p) =>
          Object.fromEntries(
            [...p.attributes].map((a) => [a.name, a.value]).sort(),
          ),
        );
      if (
        JSON.stringify(paths(doc.getElementById("sr-approved-lockup"))) !==
        JSON.stringify(paths(parse(brand)))
      )
        throw Error("Approved lockup changed");
      const bounds = [...document.querySelectorAll("text")].map((el) => {
        const b = el.getBBox();
        return {
          text: el.textContent,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        };
      });
      if (
        bounds.some(
          (b) =>
            b.x < 0 || b.y < 0 || b.x + b.width > 1280 || b.y + b.height > 360,
        )
      )
        throw Error("Text clipped outside banner");
      return {
        xml: true,
        self_contained: true,
        approved_lockup: true,
        text_bounds: bounds,
      };
    },
    { svg, brand },
  );
  const animations = await page.evaluate(() =>
    document.getAnimations().map((a) => a.effect.getTiming().duration),
  );
  assert.equal(animations.length, 6);
  assert.ok(animations.every((d) => d === 12000));
  const frames = [];
  for (const time of [0, 2640, 5280, 7200, 8880, 10680, 12000]) {
    await page.evaluate((time) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = time;
      }
    }, time);
    const image = await page.screenshot({
      path: path.join(out, `frame-${time}.png`),
    });
    frames.push({ time, sha256: sha(image) });
  }
  assert.equal(
    frames[0].sha256,
    frames.at(-1).sha256,
    "Loop seam must match the first frame",
  );
  assert.ok(
    new Set(frames.map((f) => f.sha256)).size >= 5,
    "Storyboard must visibly evolve",
  );
  await page.evaluate(() => {
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = ".motion{animation:none!important;opacity:0!important}";
    document.documentElement.append(style);
  });
  const poster = await page.screenshot({
    path: path.join(out, "poster-no-animation.png"),
  });
  const first = await fs.readFile(path.join(out, "frame-0.png"));
  // Removing composited animations changes Chromium's text antialiasing. Permit
  // less than 1/255 average channel error; loop and stillness remain exact checks.
  const posterError = await compare(poster, first);
  assert.ok(posterError < 1, "Animation-less poster loses content");
  // Chromium's per-context DevTools emulation did not reach SVG <img> documents
  // in the observed build. Exercise its browser-level OS preference override too.
  reducedBrowser = await chromium.launch({
    headless: true,
    args: ["--force-prefers-reduced-motion"],
  });
  const reduced = await reducedBrowser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 360 },
    deviceScaleFactor: 1,
  });
  const still = await reduced.newPage();
  await still.goto(origin + "/hero.svg");
  assert.equal(await still.evaluate(() => document.getAnimations().length), 0);
  const reducedShot = await still.screenshot({
    path: path.join(out, "reduced-motion.png"),
  });
  await still.waitForTimeout(2000); // Observe real time: there must be no residual motion.
  assert.equal(
    sha(await still.screenshot()),
    sha(reducedShot),
    "Reduced-motion scene moved",
  );
  assert.equal(
    sha(reducedShot),
    sha(poster),
    "Reduced motion lost the complete static poster",
  );
  await still.goto(origin + "/");
  await still.locator("img").evaluate((img) => img.decode());
  await still.screenshot({ path: path.join(out, "image-mode-reduced.png") });
  const imgBefore = sha(
    await still
      .locator("img")
      .screenshot({ path: path.join(out, "image-mode-reduced-first.png") }),
  );
  await still.waitForTimeout(2000);
  assert.equal(
    sha(
      await still
        .locator("img")
        .screenshot({ path: path.join(out, "image-mode-reduced-last.png") }),
    ),
    imgBefore,
    "Embedded reduced-motion image moved",
  );
  await reduced.close();
  await page.goto(origin + "/");
  await page.locator("img").evaluate((img) => img.decode());
  const initial = sha(await page.locator("img").screenshot());
  await page.waitForTimeout(2800); // Observe motion in actual SVG image mode, not inline DOM.
  assert.notEqual(
    sha(
      await page
        .locator("img")
        .screenshot({ path: path.join(out, "image-mode-motion.png") }),
    ),
    initial,
    "Image-mode animation did not run",
  );
  for (const width of [896, 390]) {
    await page.setViewportSize({ width, height: 360 });
    await page.screenshot({ path: path.join(out, `image-width-${width}.png`) });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Image overflows README width",
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const results = {
    ...sourceChecks,
    frames,
    loop_seam: true,
    poster: true,
    poster_mean_channel_error: posterError,
    reduced_motion: true,
    image_mode: true,
    no_external_requests: true,
    readme_local_links: true,
    bytes: Buffer.byteLength(svg),
  };
  await fs.writeFile(
    path.join(out, "results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(
    `Validated ${results.bytes}-byte banner: XML, brand geometry, storyboard, exact loop seam, poster, reduced motion, image mode, 896/390px layouts and README links.`,
  );
} finally {
  if (reducedBrowser) await reducedBrowser.close();
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
