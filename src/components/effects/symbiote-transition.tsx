/* ------------------------------------------------------------------ */
/*  TWEAK ME: defaults for the whole effect                           */
/* ------------------------------------------------------------------ */
export type Origin = "top-right" | "top-left" | "bottom-right" | "bottom-left";
export type Target = "dark" | "light";

export interface GooColors {
  color: string; // goo body
  sheen: string; // wet highlight
  rim: string;   // faint outline so the goo stays visible
}

export interface SymbioteConfig {
  origin: Origin;        // corner the goo starts from
  target: Target;        // theme we are switching TO (picks the goo color)
  durationMs: number;    // whole effect, start to finish
  tendrils: number;      // main tendrils fanning out of the corner
  branches: number;      // branches per main tendril (they sub-branch too)
  thickness: number;     // 1 = default, 0.6 = thin, 1.5 = fat
  wobble: number;        // how much tendrils meander
  edgeRoughness: number; // how ragged the leading edge is
  trail: number;         // how long the goo lingers behind its front (0.1 short, 0.5 long)
  palette: Record<Target, GooColors>;
  seed?: number;         // set a number for a repeatable shape
}

export const DEFAULT_CONFIG: SymbioteConfig = {
  origin: "top-right",
  target: "light",
  durationMs: 2400,
  tendrils: 26,
  branches: 3,
  thickness: 1,
  wobble: 1,
  edgeRoughness: 1,
  trail: 0.3,
  palette: {
    // going TO dark -> black goo
    dark: {
      color: "#040404",
      sheen: "rgba(255,255,255,0.16)",
      rim: "rgba(255,255,255,0.12)",
    },
    // going TO light -> white goo
    light: {
      color: "#ffffff",
      sheen: "rgba(0,0,0,0.10)",
      rim: "rgba(0,0,0,0.16)",
    },
  },
};

// Tendrils run on a faster clock than the mass so they lead the front.
const TENDRIL_LEAD = 1.5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise1D(rng: () => number, size = 256) {
  const v = Array.from({ length: size }, () => rng());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % size) + size) % size];
    const b = v[(((i + 1) % size) + size) % size];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/* ------------------------------------------------------------------ */
/*  Geometry: work in "diagonal space" (t along the sweep, u across)  */
/* ------------------------------------------------------------------ */
interface Frame {
  ox: number; oy: number;
  dx: number; dy: number;
  px: number; py: number;
  L: number;
  umin: number; umax: number;
  aMin: number; aMax: number;
}

function makeFrame(w: number, h: number, origin: Origin): Frame {
  const C: Record<Origin, [number, number]> = {
    "top-left": [0, 0],
    "top-right": [w, 0],
    "bottom-left": [0, h],
    "bottom-right": [w, h],
  };
  const OPP: Record<Origin, Origin> = {
    "top-left": "bottom-right",
    "bottom-right": "top-left",
    "top-right": "bottom-left",
    "bottom-left": "top-right",
  };
  const [ox, oy] = C[origin];
  const [tx, ty] = C[OPP[origin]];
  const L = Math.hypot(tx - ox, ty - oy);
  const dx = (tx - ox) / L;
  const dy = (ty - oy) / L;
  const px = -dy;
  const py = dx;

  let umin = Infinity, umax = -Infinity, aMin = Infinity, aMax = -Infinity;
  for (const key of Object.keys(C) as Origin[]) {
    const [cx, cy] = C[key];
    const rx = cx - ox;
    const ry = cy - oy;
    const t = rx * dx + ry * dy;
    const u = rx * px + ry * py;
    umin = Math.min(umin, u);
    umax = Math.max(umax, u);
    if (key !== origin && key !== OPP[origin]) {
      const a = Math.atan2(u, t);
      aMin = Math.min(aMin, a);
      aMax = Math.max(aMax, a);
    }
  }
  return { ox, oy, dx, dy, px, py, L, umin, umax, aMin, aMax };
}

const toXY = (f: Frame, t: number, u: number): [number, number] => [
  f.ox + f.dx * t + f.px * u,
  f.oy + f.dy * t + f.py * u,
];

/* ------------------------------------------------------------------ */
/*  Tendrils                                                          */
/* ------------------------------------------------------------------ */
interface Tendril {
  xs: number[]; ys: number[];
  ts: number[]; us: number[];
  nx: number[]; ny: number[];
  hs: number[];
  n: number; step: number; total: number;
  baseW: number; taper: number;
  delay: number; dur: number; pow: number;
  lumpFreq: number; lumpPhase: number;
  light: number;
}

interface TendrilOpts {
  f: Frame;
  rng: () => number;
  noise: (x: number) => number;
  t0: number; u0: number;
  angle: number; length: number;
  baseW: number;
  delay: number; dur: number; pow: number;
  wobble: number;
}

function makeTendril(o: TendrilOpts): Tendril {
  const step = 10;
  const n = Math.floor(o.length / step) + 1;
  const xs: number[] = [], ys: number[] = [], ts: number[] = [], us: number[] = [], hs: number[] = [];
  let t = o.t0, u = o.u0, dev = 0;
  const ph = o.rng() * 500;

  for (let i = 0; i < n; i++) {
    const [x, y] = toXY(o.f, t, u);
    xs.push(x); ys.push(y); ts.push(t); us.push(u);
    const a = o.angle + dev;
    hs.push(a);
    dev += (o.noise(ph + i * step * 0.008) - 0.5) * 0.14 * o.wobble;
    dev *= 0.975;
    t += Math.cos(a) * step;
    u += Math.sin(a) * step;
  }

  const nx: number[] = [], ny: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    let tx = xs[b] - xs[a];
    let ty = ys[b] - ys[a];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    nx.push(-ty); ny.push(tx);
  }

  const m = n >> 1;
  const light = nx[m] * -0.7 + ny[m] * -0.7 >= 0 ? 1 : -1;
  const total = (n - 1) * step;

  return {
    xs, ys, ts, us, nx, ny, hs, n, step, total,
    baseW: o.baseW,
    taper: Math.max(70, Math.min(total * 0.28, 380)),
    delay: o.delay, dur: o.dur, pow: o.pow,
    lumpFreq: 0.02 + o.rng() * 0.02,
    lumpPhase: o.rng() * Math.PI * 2,
    light,
  };
}

function buildShapes(rng: () => number, f: Frame, cfg: SymbioteConfig): Tendril[] {
  const noise = makeNoise1D(rng);
  const shapes: Tendril[] = [];
  const base = Math.max(22, Math.min(f.L / 34, 62)) * cfg.thickness;

  const addBranches = (parent: Tendril, depth: number) => {
    const count = depth === 1 ? cfg.branches : rng() < 0.5 ? 1 : 0;
    for (let b = 0; b < count; b++) {
      const frac = 0.2 + rng() * 0.6;
      const k = Math.floor(frac * (parent.n - 1));
      const side = rng() < 0.5 ? -1 : 1;
      const angle = parent.hs[k] + side * (0.4 + rng() * 0.6);
      const length = parent.total * (depth === 1 ? 0.2 + rng() * 0.3 : 0.1 + rng() * 0.15);
      const child = makeTendril({
        f, rng, noise,
        t0: parent.ts[k], u0: parent.us[k],
        angle, length,
        baseW: parent.baseW * (0.45 + rng() * 0.2),
        delay: parent.delay + parent.dur * Math.pow(frac, 1 / parent.pow),
        dur: parent.dur * (0.3 + rng() * 0.25),
        pow: 0.8 + rng() * 0.3,
        wobble: cfg.wobble,
      });
      shapes.push(child);
      if (depth < 2) addBranches(child, depth + 1);
    }
  };

  for (let i = 0; i < cfg.tendrils; i++) {
    const frac = (i + 0.2 + rng() * 0.6) / cfg.tendrils;
    const main = makeTendril({
      f, rng, noise,
      t0: 0, u0: (rng() - 0.5) * 20,
      angle: f.aMin + (f.aMax - f.aMin) * frac,
      length: f.L * 1.25,
      baseW: base * (0.8 + rng() * 0.6),
      delay: rng() * 0.1,
      dur: 0.7 + rng() * 0.25,
      pow: 0.6 + rng() * 0.4,
      wobble: cfg.wobble,
    });
    shapes.push(main);
    addBranches(main, 1);
  }
  return shapes;
}

function tendrilShape(td: Tendril, p: number) {
  const x = clamp01((p - td.delay) / td.dur);
  if (x <= 0) return null;
  const vis = td.total * Math.pow(x, td.pow);
  if (vis < td.step) return null;

  const k = Math.min(td.n - 1, Math.floor(vis / td.step));
  const taperLen = Math.max(20, Math.min(vis * 0.6, td.taper));
  const lx: number[] = [], ly: number[] = [], rx: number[] = [], ry: number[] = [];
  const sheen = new Path2D();
  let started = false;

  for (let i = 0; i <= k; i++) {
    const d = vis - i * td.step;
    const taper = Math.pow(clamp01(d / taperLen), 0.6);
    const lump = 1 + 0.18 * Math.sin(i * td.step * td.lumpFreq + td.lumpPhase);
    const w = td.baseW * taper * lump;
    const hw = w / 2;
    const nx = td.nx[i], ny = td.ny[i];
    lx.push(td.xs[i] + nx * hw); ly.push(td.ys[i] + ny * hw);
    rx.push(td.xs[i] - nx * hw); ry.push(td.ys[i] - ny * hw);

    if (w > 12) {
      const off = td.light * w * 0.22;
      const hx = td.xs[i] + nx * off;
      const hy = td.ys[i] + ny * off;
      if (!started) { sheen.moveTo(hx, hy); started = true; }
      else sheen.lineTo(hx, hy);
    }
  }

  let tipX = td.xs[k], tipY = td.ys[k];
  if (k < td.n - 1) {
    const fr = (vis - k * td.step) / td.step;
    tipX += (td.xs[k + 1] - td.xs[k]) * fr;
    tipY += (td.ys[k + 1] - td.ys[k]) * fr;
  }

  const fill = new Path2D();
  fill.moveTo(lx[0], ly[0]);
  for (let i = 1; i <= k; i++) fill.lineTo(lx[i], ly[i]);
  fill.lineTo(tipX, tipY);
  for (let i = k; i >= 0; i--) fill.lineTo(rx[i], ry[i]);
  fill.closePath();
  return { fill, sheen };
}

/* ------------------------------------------------------------------ */
/*  Runner                                                            */
/* ------------------------------------------------------------------ */
const VT_CSS = `
::view-transition-group(root),
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }

/* the NEW theme is only visible inside the shape we feed in each frame */
::view-transition-new(root) { clip-path: var(--symbiote-clip, inset(100%)); }

/* the goo canvas rides on top as its own layer, untouched by the mask */
::view-transition-group(symbiote-goo),
::view-transition-old(symbiote-goo),
::view-transition-new(symbiote-goo) { animation: none; mix-blend-mode: normal; }
::view-transition-old(symbiote-goo) { display: none; }
`;

type ViewTransitionLike = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};

export function runSymbioteTransition(
  swap: () => void,
  overrides: Partial<SymbioteConfig> = {}
): Promise<void> {
  const cfg: SymbioteConfig = { ...DEFAULT_CONFIG, ...overrides };

  return new Promise<void>((resolve) => {
    const d = document as unknown as {
      startViewTransition?: (cb: () => void | Promise<void>) => ViewTransitionLike;
    };

    // Browser without View Transitions: just swap, no goo.
    if (typeof d.startViewTransition !== "function") {
      swap();
      resolve();
      return;
    }

    const root = document.documentElement;
    const colors = cfg.palette[cfg.target];

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    canvas.style.setProperty("view-transition-name", "symbiote-goo");

    const style = document.createElement("style");
    style.textContent = VT_CSS;

    let swapped = false;
    const doSwap = () => {
      if (!swapped) {
        swapped = true;
        swap();
      }
    };

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      doSwap();
      resolve();
      return;
    }

    document.head.appendChild(style);
    document.body.appendChild(canvas);

    let raf = 0;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      cancelAnimationFrame(raf);
      canvas.remove();
      style.remove();
      root.style.removeProperty("--symbiote-clip");
      resolve();
    };

    const w = root.clientWidth;
    const h = root.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const frame = makeFrame(w, h, cfg.origin);
    const rng = mulberry32(cfg.seed ?? (Math.random() * 2 ** 32) >>> 0);
    const edge = makeNoise1D(rng);
    const shapes = buildShapes(rng, frame, cfg);

    const roughness = Math.min(frame.L * 0.15, frame.L * 0.07 * cfg.edgeRoughness);
    const solid = roughness + frame.L * 0.05;        // opaque band behind the front
    const fade = frame.L * cfg.trail;                // fading trail behind that
    const reachMax = frame.L + solid + fade + 10;    // front travels until everything is clear
    const floorT = -frame.L * 0.2;
    const inset = frame.L * 0.015;                   // new page edge hides under the opaque band
    const u0 = frame.umin - 120;
    const u1 = frame.umax + 120;

    const buildMass = (reach: number, p: number) => {
      const front = (u: number) => {
        const n =
          0.55 * edge(u * 0.01 + p * 1.5) +
          0.3 * edge(u * 0.035 + p * 3 + 91) +
          0.15 * edge(u * 0.11 + 17);
        return Math.max(floorT, reach - roughness * n);
      };

      const fill = new Path2D();
      const sheen = new Path2D();
      const poly: string[] = [];
      const fmt = (pt: [number, number]) => `${pt[0].toFixed(1)}px ${pt[1].toFixed(1)}px`;

      const start = toXY(frame, floorT, u0);
      fill.moveTo(start[0], start[1]);
      poly.push(fmt(start));

      for (let u = u0; u <= u1; u += 12) {
        const t = front(u);
        const edgePt = toXY(frame, t, u);
        fill.lineTo(edgePt[0], edgePt[1]);
        poly.push(fmt(toXY(frame, Math.max(floorT, t - inset), u)));
        const sp = toXY(frame, t - 10, u);
        if (u === u0) sheen.moveTo(sp[0], sp[1]);
        else sheen.lineTo(sp[0], sp[1]);
      }

      const end = toXY(frame, floorT, u1);
      fill.lineTo(end[0], end[1]);
      fill.closePath();
      poly.push(fmt(end));

      return { fill, sheen, poly };
    };

    const render = (p: number) => {
      const reach = p * reachMax;
      ctx.clearRect(0, 0, w, h);

      const mass = buildMass(reach, p);
      // reveal the NEW theme behind the front
      root.style.setProperty("--symbiote-clip", `polygon(${mass.poly.join(",")})`);

      const fills: Path2D[] = [mass.fill];
      const sheens: Path2D[] = [mass.sheen];
      const tp = clamp01(p * TENDRIL_LEAD);
      for (const td of shapes) {
        const s = tendrilShape(td, tp);
        if (s) {
          fills.push(s.fill);
          sheens.push(s.sheen);
        }
      }

      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = colors.rim;
      ctx.lineWidth = 3;
      for (const s of fills) ctx.stroke(s);
      ctx.fillStyle = colors.color;
      for (const s of fills) ctx.fill(s);
      ctx.strokeStyle = colors.sheen;
      ctx.lineWidth = 2.5;
      for (const s of sheens) ctx.stroke(s);

      // Fade everything out behind the front: opaque at the front, clear at the tail
      const a = toXY(frame, reach - solid - fade, 0);
      const b = toXY(frame, reach - solid, 0);
      const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.3, "rgba(0,0,0,0.12)");
      g.addColorStop(0.6, "rgba(0,0,0,0.45)");
      g.addColorStop(0.85, "rgba(0,0,0,0.8)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    };

    const transition = d.startViewTransition(async () => {
      doSwap(); // the new theme is applied here; the mask decides where it shows
      await new Promise((r) => setTimeout(r, 0));
    });

    transition.finished.then(cleanup, cleanup);

    transition.ready
      .then(() => {
        // keeps the transition alive for the whole effect
        try {
          root.animate(
            { opacity: [1, 1] },
            {
              duration: cfg.durationMs + 600,
              pseudoElement: "::view-transition-new(root)",
            }
          );
        } catch {
          /* older engines: the loop below still ends it */
        }

        const t0 = performance.now();
        const tick = (now: number) => {
          try {
            const x = Math.min(1, (now - t0) / cfg.durationMs);
            render(ease(x));
            if (x >= 1) {
              root.style.setProperty("--symbiote-clip", "inset(0)");
              transition.skipTransition();
              cleanup();
              return;
            }
            raf = requestAnimationFrame(tick);
          } catch (err) {
            console.error("Symbiote transition failed:", err);
            doSwap();
            transition.skipTransition();
            cleanup();
          }
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        doSwap();
        cleanup();
      });
  });
}