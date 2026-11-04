import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from "three";

/**
 * Renders words in the page's own Inter to an alpha texture.
 * Waits for the font, so a world title never appears in a fallback face when Inter is available.
 */
export async function typeTexture(
  lines: string[],
  {
    size = 240,
    weight = 300,
    tracking = "-0.03em",
    anisotropy = 4,
  }: {
    size?: number;
    weight?: number;
    tracking?: string;
    anisotropy?: number;
  },
) {
  const font = `${weight} ${size}px Inter`;
  try {
    await document.fonts.load(font, lines.join(" "));
  } catch {
    /* The system fallback remains legible if the font cannot load. */
  }
  const setup = (ctx: CanvasRenderingContext2D) => {
    ctx.font = font;
    if ("letterSpacing" in ctx) ctx.letterSpacing = tracking;
  };
  const probe = document.createElement("canvas").getContext("2d")!;
  setup(probe);
  const lineHeight = size * 1.08;
  const pad = Math.ceil(size * 0.16);
  const width = Math.ceil(
    Math.max(...lines.map((l) => probe.measureText(l).width)) + pad * 2,
  );
  const height = Math.ceil(lineHeight * lines.length + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  setup(ctx);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) =>
    ctx.fillText(line, pad, pad + lineHeight * (i + 0.5)),
  );
  const texture = new CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = anisotropy;
  return { texture, aspect: width / height };
}
