import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  Texture,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import {
  Anchor,
  clamp,
  damp,
  lerp,
  mapAnchors,
  smooth,
  Spring,
  stepSpring,
} from "../motion";
import { beat, SCENE_END, shot, SLOT, WALL_Z } from "./direction";
import * as glsl from "./shaders";
import { typeTexture } from "./text";

export type JobMood = "idle" | "active" | "verified" | "failed";
export type Tier = "full" | "compact";
export type DiveFrame = { x: number; y: number; size: number };

export type World = {
  setAnchors(anchors: readonly Anchor[]): void;
  /** Hard cut to the current scroll position, for state changes rather than travel. */
  snap(): void;
  setJob(mood: JobMood): void;
  /** Reveal the hall with a brief fade, used when no opening plays. */
  reveal(): void;
  /** Fly through the notch of a mark drawn at this viewport rectangle. */
  dive(frame: DiveFrame, seconds: number): void;
  dispose(): void;
};

/** Scene time follows scroll through one spring. ω≈11 trails steady scrolling by ≈180ms. */
const FOLLOW = 11;
const SHELF_PATHS = [
  [
    [32, 12],
    [88, 12],
    [80, 28],
    [24, 28],
  ],
  [
    [24, 40],
    [80, 40],
    [72, 56],
    [54, 56],
    [54, 48],
    [42, 48],
    [42, 56],
    [16, 56],
  ],
  [
    [16, 68],
    [72, 68],
    [64, 84],
    [8, 84],
  ],
];
const NOTCH_Y = (48 - 52) / 24;
const HERO_EYE = 1.1;
const MARK_Z = 26;
const GROUND_LINEAR = new Color(0.00304, 0.00744, 0.02956); // Approved dark surface, #0A1530.

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function instanced(
  base: BufferGeometry,
  count: number,
  attributes: Record<string, [Float32Array, number]>,
) {
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  geometry.setAttribute("normal", base.getAttribute("normal"));
  geometry.instanceCount = count;
  for (const [name, [data, size]] of Object.entries(attributes))
    geometry.setAttribute(name, new InstancedBufferAttribute(data, size));
  return geometry;
}

/** Racks, boards and uprights of the hall. Everything is static; only shading responds. */
function buildHall(tier: Tier) {
  const rand = random(7);
  const near = tier === "full" ? 0.21 : 0.46;
  const far = tier === "full" ? 0.7 : 1.5;
  const pos: number[] = [],
    size: number[] = [],
    data: number[] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    seed: number,
    board: number,
    tab: number,
    lit: number,
  ) => {
    pos.push(x, y, z);
    size.push(w, h, d);
    data.push(seed, board, tab, lit);
  };
  const levels = 12,
    step = 1.15,
    zFar = WALL_Z + 1,
    zNear = 34;
  const racks: [number, number][] = [
    [-3.75, near],
    [3.75, near],
    [-9.75, far],
    [9.75, far],
    [-15.75, far * 1.3],
    [15.75, far * 1.3],
  ];
  for (const [x, pitch] of racks) {
    const depth = 0.72;
    for (let level = 0; level < levels; level++) {
      const base = 0.06 + level * step;
      add(
        x,
        base - 0.04,
        (zFar + zNear) / 2,
        depth + 0.2,
        0.06,
        zNear - zFar,
        0.4,
        1,
        0,
        0,
      );
      for (let z = zFar + 0.6; z < zNear;) {
        const thick = pitch * (0.34 + rand() * 0.62);
        const gap = rand() < 0.06 ? pitch * (1 + rand() * 2) : pitch * 0.09;
        const h = step * (0.5 + rand() * 0.34);
        add(
          x + (rand() - 0.5) * 0.08,
          base + h / 2,
          z + thick / 2,
          depth * (0.76 + rand() * 0.24),
          h,
          thick,
          rand(),
          0,
          rand(),
          rand(),
        );
        z += thick + gap;
      }
    }
    for (let z = zFar; z < zNear; z += 6) {
      for (const side of [-1, 1])
        add(
          x + (side * (depth + 0.2)) / 2,
          (levels * step) / 2,
          z,
          0.08,
          levels * step,
          0.08,
          0.5,
          1,
          0,
          0,
        );
    }
  }
  // Shuffle so the instance count can be lowered mid-flight and still thin evenly.
  const count = pos.length / 3;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const iPos = new Float32Array(count * 3),
    iSize = new Float32Array(count * 3),
    iData = new Float32Array(count * 4);
  for (let to = 0; to < count; to++) {
    const from = order[to];
    for (let c = 0; c < 3; c++) {
      iPos[to * 3 + c] = pos[from * 3 + c];
      iSize[to * 3 + c] = size[from * 3 + c];
    }
    for (let c = 0; c < 4; c++) iData[to * 4 + c] = data[from * 4 + c];
  }
  return { count, iPos, iSize, iData };
}

const STORE_RACKS = Array.from({ length: 13 }, (_, i) => -24 + i * 4);
const inCrossAisle = (z: number) => z > -184 && z < -166;

/** The supplier's rows, addressed by their storm seed, store position and page position. */
function buildRows(count: number) {
  const rand = random(19);
  const slots: [number, number, number][] = [];
  for (const x of STORE_RACKS)
    for (let z = -226; z <= -156; z += 1)
      if (!inCrossAisle(z))
        for (let level = 0; level < 5; level++)
          slots.push([x, 0.62 + level * 0.9, z]);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const iR = new Float32Array(count * 4),
    iGrid = new Float32Array(count * 4),
    iSheet = new Float32Array(count * 2);
  const columns = Math.round(Math.sqrt(count * 0.62));
  const lines = Math.ceil(count / columns);
  for (let i = 0; i < count; i++) {
    iR.set([rand(), rand(), rand(), rand()], i * 4);
    const slot = slots[i % slots.length];
    iGrid.set([slot[0], slot[1], slot[2], rand() < 0.024 ? 1 : 0], i * 4);
    const line = Math.floor(i / columns);
    iSheet.set(
      [
        -3.9 + ((i % columns) / (columns - 1)) * 7.8,
        4.9 - (line / Math.max(1, lines - 1)) * 9.8,
      ],
      i * 2,
    );
  }
  return { iR, iGrid, iSheet };
}

function buildFrames(tier: Tier) {
  const rand = random(31);
  const pos: number[] = [],
    size: number[] = [],
    seed: number[] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    pos.push(x, y, z);
    size.push(w, h, d);
    seed.push(rand(), rand(), rand(), rand());
  };
  const stride = tier === "full" ? 7 : 14;
  for (const x of STORE_RACKS)
    for (let z = -227; z < -155; z += stride) {
      if (inCrossAisle(z) || inCrossAisle(z + stride)) continue;
      for (const side of [-1, 1]) {
        add(x + side * 0.92, 2.4, z, 0.09, 4.8, 0.09);
        for (const y of tier === "full" ? [0.4, 2.2, 4.75] : [0.4, 4.75])
          add(x + side * 0.92, y, z + stride / 2, 0.06, 0.06, stride);
      }
    }
  return {
    count: pos.length / 3,
    iPos: new Float32Array(pos),
    iSize: new Float32Array(size),
    iR: new Float32Array(seed),
  };
}

const PLATES: { x: number; y: number; text: string; held?: boolean }[] = [
  { x: -5.2, y: 1.93, text: "EXPECTED    00017    13.5500    7" },
  { x: -5.2, y: 1.57, text: "READ BACK   00017    13.5500    7" },
  { x: 1.1, y: 1.93, text: "EXPECTED    A-2      1.35       2" },
  { x: 1.1, y: 1.57, text: "READ BACK   A-2      1.35       2" },
  { x: 7.4, y: 1.93, text: "SUPPLIER    UNKNOWN  5.00       1", held: true },
  { x: 7.4, y: 1.57, text: "HELD        NOT IN YOUR BASELINE", held: true },
];
const RUMORS: [string, number, number, number, number][] = [
  ["1.250,00", 2.2, 4.4, -20, 1.5],
  ["1,250.00", 1.5, 6.1, -33, 1.7],
  ["00017", 2.6, 2.6, -45, 1.1],
  ["17", 0.8, 3.4, -52, 1],
  ["12 boxes", 2.3, 6.2, -62, 1.8],
  ["€ or £?", 0.6, 7.2, -74, 2],
  ["13.5500", 2.4, 3.6, -84, 1.6],
  ["13,55", 0.9, 2.6, -94, 1.2],
];

/** Give the browser a turn during construction, so the opening never loses frames to it. */
const breathe = () => new Promise((done) => setTimeout(done));

export async function createWorld(
  host: HTMLElement,
  options: { tier: Tier; onLost: () => void },
): Promise<World> {
  const { tier } = options;
  const compact = tier === "compact";
  const renderer = new WebGLRenderer({
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: compact ? "default" : "high-performance",
    preserveDrawingBuffer: false,
  });
  renderer.autoClear = false;
  renderer.info.autoReset = true;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const shared = {
    uCam: { value: new Vector3() },
    uFogColor: { value: new Color(0.006, 0.012, 0.04) },
    uFog: { value: 0.0105 },
    uSlot: { value: new Vector3(0, 1, WALL_Z) },
    uSlotGlow: { value: 1 },
    uReveal: { value: 0 },
    uLights: { value: 0.6 },
    uLamp: { value: new Vector3(0, 3, 0) },
    uLampK: { value: 0 },
    uTime: { value: 0 },
    uFigure: { value: 1 },
    uFlow: { value: 0 },
    uRiver: { value: 0 },
    uCalm: { value: 0 },
    uFunnel: { value: 0 },
    uSort: { value: 0 },
    uScan: { value: -34 },
    uSheet: { value: 0 },
    uBurst: { value: 0 },
    uDepart: { value: 0 },
    uBuild: { value: 0 },
    uActive: { value: 0 },
    uFailed: { value: 0 },
    uPixel: { value: 1 },
    uDustColor: { value: new Color(0.42, 0.52, 0.86) },
    uDawn: { value: 0 },
  };
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(thing: T) => {
    disposables.push(thing);
    return thing;
  };
  const material = (
    vertexShader: string,
    fragmentShader: string,
    extras: Partial<ShaderMaterial> & { extra?: Record<string, unknown> } = {},
  ) => {
    const { extra, ...rest } = extras;
    return own(
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { ...shared, ...(extra as object) },
        ...rest,
      }),
    );
  };

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.05, 900);
  const box = own(new BoxGeometry(1, 1, 1));
  const place = (mesh: Mesh | Points, order = 0) => {
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    scene.add(mesh);
    return mesh;
  };

  // Sky: pure navy in the archive; a pale horizon arrives only with the release.
  const sky = place(
    new Mesh(
      own(new SphereGeometry(600, 24, 16)),
      material(
        /* glsl */ `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.0); }`,
        /* glsl */ `precision highp float; uniform float uDawn; uniform vec3 uFogColor; uniform float uReveal; varying vec3 vDir;
         void main(){ float y=vDir.y; vec3 c=uFogColor;
         float band=exp(-abs(y+0.02)*9.0); float core=exp(-abs(y+0.02)*42.0);
         c+=uDawn*(vec3(0.05,0.11,0.42)*band+vec3(0.85,0.72,0.66)*core*0.7);
         gl_FragColor=vec4(c*uReveal,1.0);} `,
        { side: BackSide, depthWrite: false, depthTest: false },
      ),
    ),
    -10,
  );

  await breathe();
  const hall = buildHall(tier);
  const hallGeometry = own(
    instanced(box, hall.count, {
      iPos: [hall.iPos, 3],
      iSize: [hall.iSize, 3],
      iData: [hall.iData, 4],
    }),
  );
  const uMirror0 = { value: 0 },
    uMirror1 = { value: 1 };
  const records = place(
    new Mesh(
      hallGeometry,
      material(glsl.recordVertex, glsl.recordFragment, {
        extra: { uMirror: uMirror0 },
      }),
    ),
  );
  const reflection = place(
    new Mesh(
      hallGeometry,
      material(glsl.recordVertex, glsl.recordFragment, {
        extra: { uMirror: uMirror1 },
        side: BackSide,
      }),
    ),
    -1,
  );
  reflection.visible = !compact;

  const floorGeometry = own(new PlaneGeometry(80, 180));
  const floor = place(
    new Mesh(
      floorGeometry,
      material(glsl.worldVertex, glsl.floorFragment, {
        transparent: true,
        depthWrite: false,
      }),
    ),
    1,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (WALL_Z + 40) / 2);

  // The threshold. Its door keeps the brand notch's proportion; the wall gives it scale.
  const wallMaterial = material(glsl.worldVertex, glsl.wallFragment);
  const wall = new Group();
  const wallDepth = 1.2;
  for (const [x, y, w, h] of [
    [-(SLOT.width / 2 + 60), 40, 120, 80],
    [SLOT.width / 2 + 60, 40, 120, 80],
    [0, SLOT.height + 40, SLOT.width, 80],
  ] as const) {
    const piece = new Mesh(box, wallMaterial);
    piece.position.set(x, y, WALL_Z);
    piece.scale.set(w, h, wallDepth);
    piece.frustumCulled = false;
    wall.add(piece);
  }
  scene.add(wall);
  const doorIntensity = { value: 7 };
  const door = place(
    new Mesh(
      own(new PlaneGeometry(SLOT.width, SLOT.height)),
      material(glsl.worldVertex, glsl.doorFragment, {
        extra: { uIntensity: doorIntensity },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
    2,
  );
  door.position.set(0, SLOT.height / 2, WALL_Z - wallDepth / 2);

  // Light leaving the door: a soft frustum seen from inside its own haze.
  const spillGeometry = new BufferGeometry();
  {
    const n = { x: SLOT.width / 2, y: SLOT.height },
      far = { x: 7.5, y: 8.5 },
      length = 42,
      z0 = WALL_Z + wallDepth / 2;
    const quads = [
      [
        [-n.x, 0, z0],
        [n.x, 0, z0],
        [far.x, 0, z0 + length],
        [-far.x, 0, z0 + length],
      ],
      [
        [-n.x, n.y, z0],
        [n.x, n.y, z0],
        [far.x, far.y, z0 + length],
        [-far.x, far.y, z0 + length],
      ],
      [
        [-n.x, 0, z0],
        [-n.x, n.y, z0],
        [-far.x, far.y, z0 + length],
        [-far.x, 0, z0 + length],
      ],
      [
        [n.x, 0, z0],
        [n.x, n.y, z0],
        [far.x, far.y, z0 + length],
        [far.x, 0, z0 + length],
      ],
    ];
    const positions: number[] = [],
      uvs: number[] = [],
      index: number[] = [];
    quads.forEach((quad, q) => {
      quad.forEach(([x, y, z], i) => {
        positions.push(x, y, z);
        uvs.push(i === 0 || i === 3 ? 0 : 1, i < 2 ? 0 : 1);
      });
      const b = q * 4;
      index.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    spillGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3),
    );
    spillGeometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    spillGeometry.setIndex(index);
    spillGeometry.computeBoundingSphere();
  }
  own(spillGeometry);
  const spillIntensity = { value: 0.1 };
  const spill = place(
    new Mesh(
      spillGeometry,
      material(glsl.worldVertex, glsl.spillFragment, {
        extra: { uIntensity: spillIntensity },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    ),
    3,
  );

  // One small human. Built from primitives; it only ever reads as a backlit silhouette.
  const figure = new Group();
  const figureMaterial = material(glsl.figureVertex, glsl.figureFragment);
  const limb = (
    radius: number,
    length: number,
    x: number,
    y: number,
    tilt = 0,
    depth = 0.72,
  ) => {
    const geometry = own(new CapsuleGeometry(radius, length, 4, 14));
    const mesh = new Mesh(geometry, figureMaterial);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = tilt;
    mesh.scale.z = depth;
    mesh.frustumCulled = false;
    figure.add(mesh);
  };
  limb(0.092, 0.04, 0, 1.67, 0, 0.98); // head
  limb(0.042, 0.08, 0, 1.53); // neck
  limb(0.15, 0.1, 0, 1.36); // shoulders
  limb(0.122, 0.3, 0, 1.13); // torso
  limb(0.038, 0.31, -0.2, 1.24, -0.09); // upper arms
  limb(0.038, 0.31, 0.2, 1.24, 0.09);
  limb(0.032, 0.27, -0.235, 0.91, -0.03); // forearms
  limb(0.032, 0.27, 0.235, 0.91, 0.03);
  limb(0.066, 0.36, -0.078, 0.68, -0.02); // thighs
  limb(0.066, 0.36, 0.078, 0.68, 0.02);
  limb(0.048, 0.36, -0.09, 0.26, -0.01); // shins
  limb(0.048, 0.36, 0.09, 0.26, 0.01);
  figure.position.set(0, 0, -132);
  scene.add(figure);

  await breathe();
  const rowCount = compact ? 1100 : 2600;
  const rowData = buildRows(rowCount);
  const rows = place(
    new Mesh(
      own(
        instanced(box, rowCount, {
          iR: [rowData.iR, 4],
          iGrid: [rowData.iGrid, 4],
          iSheet: [rowData.iSheet, 2],
        }),
      ),
      material(glsl.rowVertex, glsl.rowFragment),
    ),
  );

  const frameData = buildFrames(tier);
  const frames = place(
    new Mesh(
      own(
        instanced(box, frameData.count, {
          iPos: [frameData.iPos, 3],
          iSize: [frameData.iSize, 3],
          iR: [frameData.iR, 4],
        }),
      ),
      material(glsl.frameVertex, glsl.frameFragment),
    ),
  );
  const chamberFloor = place(
    new Mesh(
      own(new PlaneGeometry(68, 96)),
      material(glsl.worldVertex, glsl.chamberFragment, {
        transparent: true,
        depthWrite: false,
      }),
    ),
    -2,
  );
  chamberFloor.rotation.x = -Math.PI / 2;
  chamberFloor.position.set(0, 0, -190);

  const sheetIntensity = { value: 0 };
  const sheet = place(
    new Mesh(
      own(new PlaneGeometry(8.8, 10.8)),
      material(glsl.worldVertex, glsl.sheetFragment, {
        extra: { uIntensity: sheetIntensity },
        transparent: true,
        depthWrite: false,
      }),
    ),
    4,
  );
  sheet.position.set(0, 18.5, -205.2);

  const dustCount = compact ? 320 : 1300;
  const dustRand = random(53);
  const dustGeometry = new BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(dustCount * 3), 3),
  );
  dustGeometry.setAttribute(
    "iR",
    new BufferAttribute(
      Float32Array.from({ length: dustCount * 4 }, () => dustRand()),
      4,
    ),
  );
  own(dustGeometry);
  const dust = place(
    new Points(
      dustGeometry,
      material(glsl.dustVertex, glsl.dustFragment, {
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
    6,
  );

  // Words on the architecture. DOM headings remain the accessible source of the same copy.
  const words = await Promise.all(
    [
      { lines: ["REHEARSE."], size: 300, weight: 300, tracking: "0.02em" },
      { lines: ["VERIFY."], size: 300, weight: 200, tracking: "0.02em" },
      { lines: ["RELEASE."], size: 300, weight: 200, tracking: "0.02em" },
    ].map((spec) => typeTexture(spec.lines, { ...spec, anisotropy })),
  );
  const rumors = await Promise.all(
    RUMORS.map(([text]) =>
      typeTexture([text], { size: 120, weight: 300, anisotropy }),
    ),
  );
  const plates = await Promise.all(
    PLATES.map(({ text }) =>
      typeTexture([text], {
        size: 72,
        weight: 500,
        tracking: "0.01em",
        anisotropy,
      }),
    ),
  );
  const textures: Texture[] = [
    ...words.map((w) => w.texture),
    ...rumors.map((w) => w.texture),
    ...plates.map((w) => w.texture),
  ];
  const plane = own(new PlaneGeometry(1, 1));
  const typeMesh = (texture: Texture, tint: Color, order = 5) => {
    const uOpacity = { value: 0 };
    const uTint = { value: tint };
    const mesh = new Mesh(
      plane,
      material(glsl.worldVertex, glsl.typeFragment, {
        extra: { uMap: { value: texture }, uOpacity, uTint },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    scene.add(mesh);
    return { mesh, uOpacity, uTint };
  };
  const ink = () => new Color(0.92, 0.95, 1);
  const titleRehearse = typeMesh(words[0].texture, ink());
  titleRehearse.mesh.position.set(0, 7, -192);
  titleRehearse.mesh.rotation.x = -Math.PI / 2;
  titleRehearse.mesh.scale.set(50, 50 / words[0].aspect, 1);
  const titleVerify = typeMesh(words[1].texture, ink());
  titleVerify.mesh.position.set(1, 4, -183.6);
  titleVerify.mesh.scale.set(9.4, 9.4 / words[1].aspect, 1);
  const titleRelease = typeMesh(words[2].texture, ink());
  titleRelease.mesh.position.set(0, 41, -250);
  titleRelease.mesh.scale.set(66, 66 / words[2].aspect, 1);
  const rumorMeshes = RUMORS.map(([, x, y, z, width], i) => {
    const m = typeMesh(rumors[i].texture, ink());
    m.mesh.position.set(x, y, z);
    m.mesh.rotation.y = -x * 0.075;
    m.mesh.scale.set(width * 1.5, (width * 1.5) / rumors[i].aspect, 1);
    return m;
  });
  const COBALT = new Color(0.32, 0.46, 1);
  const AMBER = new Color(1, 0.62, 0.16);
  const plateMeshes = PLATES.map((p, i) => {
    const m = typeMesh(plates[i].texture, new Color());
    m.mesh.position.set(p.x, p.y, -178);
    const width = 3.2;
    m.mesh.scale.set(width, width / plates[i].aspect, 1);
    return { ...m, plate: p };
  });

  const ledgers = [PLATES[0], PLATES[2], PLATES[4]].map((p) => {
    const uOpacity = { value: 0 };
    const uEdge = { value: new Color(0.32, 0.46, 1) };
    const mesh = new Mesh(
      plane,
      material(glsl.worldVertex, glsl.plateFragment, {
        extra: { uOpacity, uEdge },
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.set(p.x, 1.75, -178.04);
    mesh.scale.set(3.56, 0.92, 1);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    scene.add(mesh);
    return { mesh, uOpacity, uEdge, plate: p };
  });
  const bladeOpacity = { value: 0 };
  const blade = new Mesh(
    plane,
    material(glsl.worldVertex, glsl.bladeFragment, {
      extra: { uOpacity: bladeOpacity },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  blade.rotation.y = Math.PI / 2;
  blade.scale.set(96, 11, 1);
  blade.frustumCulled = false;
  blade.renderOrder = 6;
  scene.add(blade);

  // The opening mark. Flat, exact, and only ever seen in the first three seconds.
  const markGroup = new Group();
  const surface = (r: number, g: number, b: number) =>
    material(glsl.flatVertex, glsl.flatFragment, {
      extra: { uColor: { value: new Color().setRGB(r, g, b) } },
    });
  const srgb = (hex: number) => new Color().setHex(hex);
  const cobalt = srgb(0x6c8cff),
    pale = srgb(0xf1f5ff);
  const side = surface(0.03, 0.06, 0.3);
  SHELF_PATHS.forEach((points, index) => {
    const shape = new Shape();
    points.forEach(([x, y], n) => {
      const a = (x - 48) / 24,
        b = (48 - y) / 24;
      if (n === 0) shape.moveTo(a, b);
      else shape.lineTo(a, b);
    });
    shape.closePath();
    const c = index === 0 ? cobalt : pale;
    const geometry = own(
      new ExtrudeGeometry(shape, {
        depth: 0.3,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1,
      }),
    );
    const mesh = new Mesh(geometry, [surface(c.r, c.g, c.b), side]);
    mesh.position.z = -0.3;
    mesh.frustumCulled = false;
    markGroup.add(mesh);
  });
  markGroup.position.set(0, HERO_EYE - NOTCH_Y, MARK_Z);
  markGroup.visible = false;
  scene.add(markGroup);

  // ── Post ──────────────────────────────────────────────────────────────────
  const screen = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const triangle = new BufferGeometry();
  triangle.setAttribute(
    "position",
    new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  own(triangle);
  const postScene = new Scene();
  const postMesh = new Mesh(triangle);
  postMesh.frustumCulled = false;
  postScene.add(postMesh);
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const floatColor =
    !!gl.getExtension("EXT_color_buffer_float") ||
    !!gl.getExtension("EXT_color_buffer_half_float");
  const hdr = floatColor ? HalfFloatType : UnsignedByteType;
  const target = (w: number, h: number, depth = false, samples = 0) =>
    new WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: hdr,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: depth,
      stencilBuffer: false,
      samples,
    });
  const downMaterial = own(
    new ShaderMaterial({
      vertexShader: glsl.fullscreenVertex,
      fragmentShader: glsl.downFragment,
      uniforms: {
        uSource: { value: null },
        uTexel: { value: [0, 0] },
        uThreshold: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    }),
  );
  const upMaterial = own(
    new ShaderMaterial({
      vertexShader: glsl.fullscreenVertex,
      fragmentShader: glsl.upFragment,
      uniforms: {
        uSource: { value: null },
        uTexel: { value: [0, 0] },
        uStretch: { value: 1.7 },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: AdditiveBlending,
    }),
  );
  const compositeMaterial = own(
    new ShaderMaterial({
      vertexShader: glsl.fullscreenVertex,
      fragmentShader: glsl.compositeFragment,
      uniforms: {
        uScene: { value: null },
        uBloom: { value: null },
        uBloomK: { value: 0.7 },
        uFlat: { value: 0 },
        uFade: { value: 1 },
        uFlash: { value: 0 },
        uBars: { value: 0 },
        uDim: { value: 0 },
        uDawn: shared.uDawn,
        uTime: shared.uTime,
        uAspect: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    }),
  );
  const post = compositeMaterial.uniforms;
  const sceneMsaa = compact ? 2 : 4;
  let sceneTarget: WebGLRenderTarget | null = null;
  let chain: WebGLRenderTarget[] = [];
  let quality = 0;
  const qualityScale = [1, 0.84, 0.7, 0.58];
  const maxDpr = compact ? 1.5 : 1.75;
  let width = 1,
    height = 1,
    dpr = 1;
  const allocate = () => {
    sceneTarget?.dispose();
    chain.forEach((t) => t.dispose());
    dpr = Math.min(devicePixelRatio || 1, maxDpr) * qualityScale[quality];
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    const w = Math.round(width * dpr),
      h = Math.round(height * dpr);
    sceneTarget = target(w, h, true, quality > 1 ? 0 : sceneMsaa);
    const levels = compact ? 3 : 5;
    chain = Array.from({ length: levels }, (_, i) =>
      target(w >> (i + 1), h >> (i + 1)),
    );
    shared.uPixel.value = dpr;
    post.uAspect.value = width / height;
    reflection.visible = !compact && quality < 1;
    hallGeometry.instanceCount = Math.floor(
      hall.count * (quality >= 2 ? 0.62 : 1),
    );
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Words set in the world must fit whichever frame is looking at them.
    const tall = width / height < 0.9;
    const fit = (mesh: Mesh, wide: number, aspect: number) =>
      mesh.scale.set(wide, wide / aspect, 1);
    fit(titleRehearse.mesh, tall ? 33 : 50, words[0].aspect);
    fit(titleVerify.mesh, tall ? 5.2 : 9.4, words[1].aspect);
    fit(titleRelease.mesh, tall ? 33 : 66, words[2].aspect);
    plateMeshes.forEach((m, i) =>
      fit(m.mesh, tall ? 2.2 : 2.9, plates[i].aspect),
    );
    ledgers.forEach((l) => l.mesh.scale.set(tall ? 2.46 : 3.24, 0.92, 1));
  };
  const passDown = (
    source: WebGLRenderTarget,
    into: WebGLRenderTarget,
    threshold: number,
  ) => {
    const u = downMaterial.uniforms;
    u.uSource.value = source.texture;
    u.uTexel.value = [1 / source.width, 1 / source.height];
    u.uThreshold.value = threshold;
    postMesh.material = downMaterial;
    renderer.setRenderTarget(into);
    renderer.render(postScene, screen);
  };
  const passUp = (source: WebGLRenderTarget, into: WebGLRenderTarget) => {
    const u = upMaterial.uniforms;
    u.uSource.value = source.texture;
    u.uTexel.value = [0.5 / source.width, 0.5 / source.height];
    postMesh.material = upMaterial;
    renderer.setRenderTarget(into);
    renderer.render(postScene, screen);
  };

  // ── Measure ───────────────────────────────────────────────────────────────
  const resize = () => {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // A collapsing mobile address bar changes height only. Rebuilding targets for it would hitch.
    if (
      matchMedia("(pointer:coarse)").matches &&
      rect.width === width &&
      Math.abs(rect.height - height) < 170
    )
      return;
    if (rect.width === width && rect.height === height) return;
    width = rect.width;
    height = rect.height;
    allocate();
    wake();
  };

  // ── The one clock ─────────────────────────────────────────────────────────
  let anchors: readonly Anchor[] = [];
  const spring: Spring = { value: 0, velocity: 0 };
  const pointer = { x: 0, y: 0, known: false };
  const lookX: Spring = { value: 0, velocity: 0 };
  const lookY: Spring = { value: 0, velocity: 0 };
  const lampX: Spring = { value: 0, velocity: 0 };
  const lampY: Spring = { value: 0, velocity: 0 };
  let flow = 0.12;
  let frameHandle = 0;
  let clearColor = GROUND_LINEAR;
  let previous = 0; // 0 means "first frame after a pause": never integrate the gap.
  let fadeFrom = -1;
  let diving: {
    start: number;
    seconds: number;
    fov: number;
    distance: number;
    shiftX: number;
    shiftY: number;
  } | null = null;
  let revealed = false;
  let started = false; // Nothing draws until the opening hands over or the hall is revealed.
  let activeMood = 0,
    failedMood = 0,
    targetActive = 0,
    targetFailed = 0;
  let budgetTime = 0,
    budgetFrames = 0,
    hopeless = 0;
  let disposed = false;
  const up = new Vector3(0, 1, 0);
  const lookTarget = new Vector3();
  const lampWorld = new Vector3();
  const forward = new Vector3();

  function wake() {
    if (disposed || !started || frameHandle || document.hidden) return;
    previous = 0;
    frameHandle = requestAnimationFrame(frame);
  }

  function renderOnce() {
    const main = sceneTarget!;
    renderer.setRenderTarget(main);
    // Set under the bound linear target: three encodes clear colors for whatever is bound now.
    renderer.setClearColor(clearColor, 1);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    let blooming = post.uFlat.value < 1;
    if (blooming) {
      passDown(main, chain[0], 1.2);
      for (let i = 1; i < chain.length; i++)
        passDown(chain[i - 1], chain[i], 0);
      for (let i = chain.length - 1; i > 0; i--) passUp(chain[i], chain[i - 1]);
    } else {
      renderer.setRenderTarget(chain[0]);
      renderer.clear(true, false, false);
      blooming = false;
    }
    post.uScene.value = main.texture;
    post.uBloom.value = chain[0].texture;
    postMesh.material = compositeMaterial;
    renderer.setRenderTarget(null);
    renderer.render(postScene, screen);
  }

  function frame(now: number) {
    frameHandle = 0;
    if (disposed) return;
    const elapsed = previous ? now - previous : 1000 / 60;
    previous = now;
    const dt = Math.min(elapsed, 66) / 1000;
    const t = now / 1000;
    shared.uTime.value = t;

    // Read scroll exactly once, first. This is a cached-layout read: nothing is measured per frame.
    const targetS = clamp(mapAnchors(anchors, scrollY), 0, SCENE_END);
    const before = spring.value;
    stepSpring(spring, targetS, FOLLOW, dt);
    const s = spring.value;
    const moved = Math.abs(s - before);
    const b = beat(s);

    // Pointer-driven look and lamp, on their own soft springs.
    const px = pointer.known ? pointer.x : Math.sin(t * 0.31) * 0.72;
    const py = pointer.known ? pointer.y : Math.sin(t * 0.23) * 0.5;
    stepSpring(lampX, px, 5, dt);
    stepSpring(lampY, py, 5, dt);
    stepSpring(lookX, pointer.known ? pointer.x : 0, 3.2, dt);
    stepSpring(lookY, pointer.known ? pointer.y : 0, 3.2, dt);

    // Camera.
    const view = shot(s);
    const breathe = 1 - b.dim;
    let cx = view.pos[0] + lookX.value * 0.26 * breathe,
      cy = view.pos[1] - lookY.value * 0.14 * breathe,
      cz = view.pos[2];
    cy += Math.sin(t * 0.21) * 0.035 * breathe;
    cx += Math.sin(t * 0.17) * 0.05 * breathe;
    let aimX = view.at[0],
      aimY = view.at[1],
      aimZ = view.at[2];
    let fov = view.fov;
    let shiftX = view.shift[0] * width,
      shiftY = view.shift[1] * height;
    const portrait = width / height < 0.9;
    if (portrait) {
      fov *= 1.28;
      shiftX *= 0.1;
      shiftY = -0.14 * height;
      // The ledger sits dead centre in a narrow frame.
      const ledger = smooth(3.82, 4, s) * (1 - smooth(4.52, 4.7, s));
      cx += ledger * lerp(0.2, 0.2, smooth(4, 4.5, s));
      aimX += ledger * lerp(0.1, 0.1, smooth(4, 4.5, s));
      shiftY = lerp(lerp(-0.14, -0.31, ledger), 0.12, b.depart) * height;
    }

    let flatness = 0,
      reveal = 1,
      hallOn = b.hallVisible;
    if (diving) {
      const p = clamp((now - diving.start) / (diving.seconds * 1000));
      const fly = Math.pow(smooth(0, 1, p), 1.55);
      const start = MARK_Z + diving.distance;
      cz = lerp(start, view.pos[2], fly);
      cx = lerp(0, cx, fly);
      cy = lerp(HERO_EYE, cy, fly);
      aimX = lerp(0, aimX, fly * fly);
      aimY = lerp(HERO_EYE, aimY, fly * fly);
      aimZ = lerp(-200, aimZ, fly * fly);
      fov = lerp(diving.fov, fov, fly);
      shiftX = lerp(diving.shiftX, shiftX, fly);
      shiftY = lerp(diving.shiftY, shiftY, fly);
      flatness = 1 - smooth(0.34, 0.62, p);
      reveal = smooth(0.3, 0.95, p);
      hallOn = p > 0.25;
      markGroup.visible = cz > MARK_Z - 0.4;
      if (p >= 1) {
        diving = null;
        markGroup.visible = false;
        revealed = true;
        post.uFade.value = 0;
      }
    } else if (fadeFrom >= 0) {
      const p = clamp((now - fadeFrom) / 900);
      post.uFade.value = 1 - smooth(0, 1, p);
      if (p >= 1) {
        fadeFrom = -1;
        revealed = true;
      }
    }

    camera.position.set(cx, cy, cz);
    camera.fov = fov;
    lookTarget.set(aimX, aimY, aimZ);
    up.set(Math.sin(view.roll), Math.cos(view.roll), 0);
    camera.up.copy(up);
    camera.lookAt(lookTarget);
    if (shiftX || shiftY)
      camera.setViewOffset(width, height, -shiftX, -shiftY, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    shared.uCam.value.copy(camera.position);

    // Lamp: a point in the air a little ahead, in the aisle, under the pointer.
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    lampWorld
      .copy(camera.position)
      .addScaledVector(forward, 13)
      .add(new Vector3(lampX.value * 5.4, -lampY.value * 3.8, 0));
    lampWorld.x = clamp(lampWorld.x, -3.1, 3.1);
    lampWorld.y = clamp(lampWorld.y, 0.3, 13);
    shared.uLamp.value.copy(lampWorld);
    shared.uLampK.value = b.lamp * 0.95;

    // Scene state.
    flow += dt * 0.085 * b.flowSpeed + moved * 0.05 * b.flowSpeed;
    shared.uFlow.value = flow % 1;
    shared.uRiver.value = b.river;
    shared.uCalm.value = b.calm;
    shared.uFunnel.value = b.funnel;
    shared.uSort.value = b.sort;
    shared.uBuild.value = b.build;
    shared.uScan.value = b.scan;
    shared.uSheet.value = b.sheet;
    shared.uBurst.value = b.burst;
    shared.uDepart.value = b.depart;
    shared.uLights.value = b.lights;
    shared.uSlotGlow.value = b.slotGlow;
    shared.uFigure.value = b.figure;
    shared.uFog.value = b.fog;
    shared.uDawn.value = b.dawn;
    shared.uReveal.value = reveal;
    activeMood = damp(activeMood, targetActive, 3, dt);
    failedMood = damp(failedMood, targetFailed, 3, dt);
    shared.uActive.value = activeMood;
    shared.uFailed.value = failedMood;
    const cold = shared.uFogColor.value;
    cold.setRGB(
      lerp(lerp(0.0018, 0.0012, b.rehearsal), 0.012, b.dawn),
      lerp(lerp(0.0036, 0.0034, b.rehearsal), 0.024, b.dawn),
      lerp(lerp(0.012, 0.016, b.rehearsal), 0.1, b.dawn),
    );

    records.visible = hallOn;
    reflection.visible = hallOn && !compact && quality < 1;
    floor.visible = hallOn;
    wall.visible = hallOn;
    door.visible = hallOn && b.slotOpen < 0.999;
    spill.visible = hallOn && b.slotOpen < 0.999;
    figure.visible = hallOn && b.figure > 0.001;
    doorIntensity.value = lerp(0.9, 2.6, smooth(0.9, 2, s)) * (1 - b.slotOpen);
    spillIntensity.value = 0.012 + 0.05 * smooth(1.2, 2, s);
    const riverOn = hallOn && b.river > 0.001;
    rows.visible = riverOn || b.chamberVisible;
    frames.visible = b.chamberVisible && b.build > 0.001 && b.burst < 0.999;
    chamberFloor.visible = frames.visible && b.burst < 0.46;
    sheetIntensity.value = smooth(0.74, 1, b.sheet) * (1 - b.dim * 0.3);
    sheet.visible = sheetIntensity.value > 0.001;
    const away = b.depart * b.depart;
    sheet.position.set(0, 18.5 + away * 15, -205.2 - away * 350);
    sky.visible = reveal > 0;
    dust.visible = reveal > 0.05;
    const dustGlow = lerp(0.8, 1.5, b.dawn);
    shared.uDustColor.value.setRGB(
      0.34 * dustGlow,
      0.44 * dustGlow,
      0.84 * dustGlow,
    );

    titleRehearse.uOpacity.value = b.titleRehearse * 0.92;
    titleRehearse.mesh.visible = b.titleRehearse > 0.001;
    titleVerify.mesh.position.x = cx * 0.8 + 1;
    titleVerify.uOpacity.value = b.titleVerify * 0.1;
    titleVerify.mesh.visible = b.titleVerify > 0.001;
    titleRelease.uOpacity.value = b.titleRelease * 0.9;
    titleRelease.mesh.visible = b.titleRelease > 0.001;
    for (const r of rumorMeshes) {
      const reach = r.mesh.position.z - cz;
      const near = smooth(-58, -26, reach) * (1 - smooth(-15, -8, reach));
      r.uOpacity.value = b.labels * near * 0.95;
      r.mesh.visible = r.uOpacity.value > 0.002;
    }
    for (const m of plateMeshes) {
      const passed = smooth(-0.8, 0.8, b.scan - (m.plate.x - 3));
      const end = m.plate.held ? AMBER : ink();
      m.uTint.value.copy(COBALT).lerp(end, passed);
      m.uOpacity.value = b.plates * lerp(0.55, 1, passed);
      m.mesh.visible = b.plates > 0.002;
    }

    for (const l of ledgers) {
      const passed = smooth(-0.8, 0.8, b.scan - (l.plate.x - 3));
      l.uEdge.value.copy(COBALT).lerp(l.plate.held ? AMBER : ink(), passed);
      l.uOpacity.value = b.plates;
      l.mesh.visible = b.plates > 0.002;
    }
    blade.position.set(b.scan, 5.5, -190);
    bladeOpacity.value = b.blade * 0.13;
    blade.visible = b.blade > 0.002;

    post.uFlat.value = flatness;
    post.uFlash.value = b.flash;
    post.uBars.value = b.bars;
    post.uDim.value = b.dim;
    post.uBloomK.value = 0.5;
    host.dataset.sceneTime = s.toFixed(3);

    clearColor = flatness > 0 ? GROUND_LINEAR : cold;
    renderOnce();

    // Adaptive quality moves in rare, deliberate steps and never oscillates. A device that
    // still cannot hold a film at the lowest step gets the page back, not a slideshow.
    if (!diving && elapsed < 1000) {
      budgetTime += elapsed;
      budgetFrames++;
      if (budgetTime >= 1500) {
        const average = budgetTime / budgetFrames;
        budgetTime = 0;
        budgetFrames = 0;
        if (average > 25 && quality < qualityScale.length - 1) {
          quality++;
          allocate();
          host.dataset.quality = String(quality);
        } else if (average > 45) {
          if (++hopeless >= 2) {
            options.onLost();
            return;
          }
        } else hopeless = 0;
      }
    }

    // Stop only where the page is opaque and nothing is changing.
    const settled =
      Math.abs(targetS - s) < 0.0004 && Math.abs(spring.velocity) < 0.0004;
    const restful =
      settled &&
      s >= 5.99 && // Only the opaque studio rests; the closing shot stays alive.
      s <= 6.03 &&
      revealed &&
      !diving &&
      fadeFrom < 0 &&
      targetActive === 0 &&
      activeMood < 0.002;
    if (!restful) frameHandle = requestAnimationFrame(frame);
    host.dataset.running = restful ? "idle" : "live";
  }

  // ── Warm everything up front so nothing compiles or uploads during the film ──
  const pointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    pointer.known = true;
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  };
  const leave = () => {
    pointer.known = false;
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    } else wake();
  };
  const lost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    options.onLost();
  };
  const scrolled = () => wake();

  const observer = new ResizeObserver(resize);
  const rect = host.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  allocate();
  host.appendChild(canvas);

  await breathe();
  for (const texture of textures) {
    renderer.initTexture(texture);
    await breathe();
  }
  scene.traverse((o) => (o.visible = true));
  await renderer.compileAsync(scene, camera); // Parallel where the driver allows it.
  await breathe();
  {
    const warm = target(4, 4, true);
    const sink = target(4, 4);
    renderer.setRenderTarget(warm);
    renderer.setClearColor(0, 1);
    renderer.clear();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    await breathe(); // A cold driver cache makes these first draws long: keep them apart.
    renderer.setRenderTarget(sink);
    post.uScene.value = warm.texture;
    post.uBloom.value = warm.texture;
    for (const m of [compositeMaterial, downMaterial, upMaterial]) {
      if (m !== compositeMaterial) m.uniforms.uSource.value = warm.texture;
      postMesh.material = m;
      renderer.render(postScene, screen);
      await breathe();
    }
    renderer.setRenderTarget(null);
    warm.dispose();
    sink.dispose();
    // Allocate the full-size targets now, so the handover's first frame is an ordinary one.
    post.uFade.value = 1;
    renderOnce();
  }
  markGroup.visible = false;

  observer.observe(host);
  addEventListener("scroll", scrolled, { passive: true });
  addEventListener("pointermove", pointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("webglcontextlost", lost);

  return {
    setAnchors(next) {
      anchors = next;
      wake();
    },
    snap() {
      spring.value = clamp(mapAnchors(anchors, scrollY), 0, SCENE_END);
      spring.velocity = 0;
      wake();
    },
    setJob(mood) {
      targetActive = mood === "active" ? 1 : 0;
      targetFailed = mood === "failed" ? 1 : 0;
      wake();
    },
    reveal() {
      spring.value = clamp(mapAnchors(anchors, scrollY), 0, SCENE_END);
      spring.velocity = 0;
      diving = null;
      markGroup.visible = false;
      post.uFade.value = 1;
      fadeFrom = performance.now();
      started = true;
      wake();
    },
    dive(frameRect, seconds) {
      // Put the WebGL mark exactly where the DOM mark is, so the handover is invisible.
      const openingFov = 30;
      const worldSize = 4; // The 96-unit canvas at 24 units per world unit.
      const span = 2 * Math.tan((openingFov * Math.PI) / 360);
      const distance = (worldSize * height) / (frameRect.size * span);
      const pixelsPerWorld = height / (distance * span);
      diving = {
        start: performance.now(),
        seconds,
        fov: openingFov,
        distance,
        shiftX: frameRect.x - width / 2,
        // The camera sits level with the notch; the mark's centre is above that axis.
        shiftY: frameRect.y - (height / 2 + NOTCH_Y * pixelsPerWorld),
      };
      markGroup.visible = true;
      post.uFade.value = 0;
      started = true;
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameHandle);
      observer.disconnect();
      removeEventListener("scroll", scrolled);
      removeEventListener("pointermove", pointerMove);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", lost);
      textures.forEach((texture) => texture.dispose());
      disposables.forEach((thing) => thing.dispose());
      sceneTarget?.dispose();
      chain.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
