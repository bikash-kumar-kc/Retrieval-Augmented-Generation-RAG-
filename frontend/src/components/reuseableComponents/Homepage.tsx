import React, { useEffect, useRef, useState } from "react";
import { FadeIn } from "./FadeInAnimation";
import { useNavigate } from "react-router";

const RED = "#ff3a10"; // start of the RAG gradient
const SPARK = "#ff6a3d"; // arrows, dots, accent card
const PAPER = "#f6f5f2"; // light text

type HomeProps = {
  onLogin?: () => void;
  onSignUp?: () => void;
};

/* ---------- small hooks ---------- */

/* Loads Poppins once, so the component is fully standalone. */
const usePoppins = () => {
  useEffect(() => {
    const id = "rag-hero-poppins";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;600;800&display=swap";
    document.head.appendChild(link);
  }, []);
};

/* SVG animations ignore CSS media queries, so we check it in JS. */
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
};

/* ---------- workflow data (positions are % of the screen) ---------- */

type NodeDef = {
  id: string;
  title: string;
  sub: string;
  L: [number, number]; // landscape position
  P: [number, number]; // portrait position
  accent?: boolean;
};

const NODES: NodeDef[] = [
  {
    id: "docs",
    title: "Your docs",
    sub: "PDFs, notes, sites",
    L: [12, 18],
    P: [24, 9],
  },
  {
    id: "chunk",
    title: "Chunk",
    sub: "split into pieces",
    L: [38, 10],
    P: [76, 16],
  },
  {
    id: "embed",
    title: "Embed",
    sub: "text to numbers",
    L: [68, 16],
    P: [24, 26],
  },
  {
    id: "db",
    title: "Vector DB",
    sub: "stored, indexed",
    L: [88, 36],
    P: [76, 31],
  },
  // These three tuck behind / under the RAG word and peek out around it
  { id: "q", title: "Question", sub: "user asks", L: [24, 42], P: [86, 50] },
  {
    id: "ret",
    title: "Retrieve",
    sub: "closest chunks",
    L: [75, 48],
    P: [30, 60],
  },
  { id: "llm", title: "LLM", sub: "reads context", L: [46, 61], P: [76, 76] },
  {
    id: "ans",
    title: "Answer",
    sub: "grounded, cited",
    L: [84, 82],
    P: [26, 88],
    accent: true,
  },
];

/* bend = how far the arrow bows sideways (fraction of its length) */
const EDGES: { from: string; to: string; bendL: number; bendP: number }[] = [
  { from: "docs", to: "chunk", bendL: 0.08, bendP: 0.06 },
  { from: "chunk", to: "embed", bendL: 0.08, bendP: 0.06 },
  { from: "embed", to: "db", bendL: 0.1, bendP: 0.06 },
  { from: "db", to: "ret", bendL: -0.12, bendP: 0.06 },
  { from: "q", to: "ret", bendL: 0.05, bendP: 0.05 },
  { from: "ret", to: "llm", bendL: 0.08, bendP: 0.06 },
  { from: "llm", to: "ans", bendL: 0.06, bendP: 0.05 },
];

/* how far each card drifts (px) */
const FLOAT: [number, number][] = [
  [8, -12],
  [-7, -9],
  [6, -11],
  [-9, -8],
  [7, -12],
  [-6, -10],
  [9, -9],
  [-8, -11],
];

const f = (n: number) => n.toFixed(1);

/* ---------- workflow background ---------- */

const WorkflowBackground: React.FC<{
  w: number;
  h: number;
  still: boolean;
}> = ({ w, h, still }) => {
  if (!w || !h) return null;

  const portrait = w / h < 0.9;
  const nw = portrait
    ? Math.min(108, w * 0.28)
    : Math.max(84, Math.min(120, w * 0.074));
  const nh = nw * (portrait ? 0.4 : 0.42);
  const titleSize = Math.max(9.5, nh * 0.34);
  const subSize = Math.max(7.5, nh * 0.2);

  const pos: Record<string, { x: number; y: number }> = {};
  NODES.forEach((n) => {
    const [px, py] = portrait ? n.P : n.L;
    pos[n.id] = { x: (px / 100) * w, y: (py / 100) * h };
  });

  const edges = EDGES.map((e, i) => {
    const a = pos[e.from];
    const b = pos[e.to];
    const bend = portrait ? e.bendP : e.bendL;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = (a.x + b.x) / 2 + (-dy / len) * bend * len;
    const cy = (a.y + b.y) / 2 + (dx / len) * bend * len;
    return {
      d: `M${f(a.x)} ${f(a.y)} Q${f(cx)} ${f(cy)} ${f(b.x)} ${f(b.y)}`,
      dur: 2.6 + (i % 3) * 0.7,
      begin: i * 0.5,
    };
  });

  return (
    <svg
      aria-hidden="true"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="pointer-events-none absolute inset-0 opacity-20"
    >
      {/* arrows */}
      {edges.map((e, i) => (
        <path
          key={`line-${i}`}
          d={e.d}
          fill="none"
          stroke={SPARK}
          strokeOpacity={0.7}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray="3 9"
        >
          {!still && (
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-48"
              dur="2.4s"
              repeatCount="indefinite"
            />
          )}
        </path>
      ))}

      {/* travelling packets (under the cards, so they "enter" them) */}
      {!still &&
        edges.map((e, i) => (
          <circle key={`dot-${i}-${w}-${h}`} r={4} fill={SPARK}>
            <animateMotion
              dur={`${e.dur}s`}
              begin={`${e.begin}s`}
              repeatCount="indefinite"
              path={e.d}
            />
          </circle>
        ))}

      {/* floating cards: outer <g> places, inner <g> drifts */}
      {NODES.map((n, i) => {
        const p = pos[n.id];
        const [fx, fy] = FLOAT[i];
        return (
          <g key={n.id} transform={`translate(${f(p.x)} ${f(p.y)})`}>
            <g>
              {!still && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0 0; ${fx} ${fy}; 0 0`}
                  keyTimes="0; 0.5; 1"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                  dur={`${5 + (i % 4) * 0.9}s`}
                  begin={`${-(i * 0.7)}s`}
                  repeatCount="indefinite"
                />
              )}
              <rect
                x={-nw / 2}
                y={-nh / 2}
                width={nw}
                height={nh}
                rx={nh * 0.3}
                fill="#15110f"
                stroke={n.accent ? SPARK : "#ffffff"}
                strokeWidth={n.accent ? 2 : 1.4}
                strokeOpacity={n.accent ? 0.95 : 0.55}
              />
              <text
                x={0}
                y={-nh * 0.04}
                textAnchor="middle"
                fontSize={titleSize}
                fill={n.accent ? SPARK : PAPER}
                className="font-semibold"
              >
                {n.title}
              </text>
              <text
                x={0}
                y={nh * 0.26}
                textAnchor="middle"
                fontSize={subSize}
                fill={PAPER}
                fillOpacity={0.65}
                className="font-medium"
              >
                {n.sub}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- hand-drawn double underline for RAG ---------- */

const FreehandUnderline: React.FC<{ still: boolean }> = ({ still }) => {
  /* each stroke "draws itself" once; pathLength=1 makes the maths simple */
  const draw = (begin: string, dur: string) =>
    still ? null : (
      <animate
        attributeName="stroke-dashoffset"
        from="1"
        to="0"
        dur={dur}
        begin={begin}
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 1"
        keySplines="0.65 0.05 0.36 1"
      />
    );

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 44"
      preserveAspectRatio="none"
      fill="none"
      strokeWidth={11}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute -left-[2%] top-full -mt-[0.06em] h-[0.27em] w-[104%] overflow-visible drop-shadow-[0_0_14px_rgba(255,90,40,0.4)]"
    >
      <defs>
        <linearGradient id="rag-underline" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={RED} />
          <stop offset="0.28" stopColor={RED} />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <path
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={still ? 0 : 1}
        stroke="url(#rag-underline)"
        d="M6 20 C 55 6, 105 34, 168 16 S 275 6, 335 22 S 384 22, 396 10"
      >
        {draw("0.5s", "0.9s")}
      </path>
      <path
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={still ? 0 : 1}
        stroke="url(#rag-underline)"
        d="M40 36 C 130 26, 215 40, 322 31"
      >
        {draw("1.25s", "0.6s")}
      </path>
    </svg>
  );
};

/* ---------- film grain (an SVG noise filter, no image file) ---------- */

const Grain: React.FC = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 h-full w-full opacity-25 mix-blend-overlay"
  >
    <filter id="rag-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.85"
        numOctaves="2"
        stitchTiles="stitch"
      />
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.3 0 0 0 -0.45" />
    </filter>
    <rect width="100%" height="100%" filter="url(#rag-grain)" />
  </svg>
);

/* ---------- page ---------- */

const BuildYourOwnRagHeroDark: React.FC<HomeProps> = ({
  onLogin,
  onSignUp,
}) => {
  usePoppins();
  const still = usePrefersReducedMotion();

  /* measure the screen so the workflow geometry is always undistorted */
  const bgRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#070706] font-['Poppins',sans-serif] text-[#f6f5f2]">
      {/* Light haze, top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_98%_-5%,rgba(200,200,196,0.55)_0%,rgba(120,120,116,0.18)_45%,rgba(0,0,0,0)_70%)]"
      />

      {/* Orange glow, bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_30%_115%,rgba(255,96,32,1)_0%,rgba(220,62,14,0.72)_30%,rgba(120,26,4,0.3)_55%,rgba(0,0,0,0)_78%)]"
      />

      {/* RAG workflow: faint cards floating all over the screen */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <WorkflowBackground w={size.w} h={size.h} still={still} />
      </div>

      <Grain />

      {/* Top-right auth buttons */}
      <header className="absolute right-0 top-0 z-20 flex items-center gap-3 p-5 sm:p-8">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="rounded-full px-5 py-2 text-sm font-semibold text-[#f6f5f2] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff3a10]"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={onSignUp}
          className="rounded-full bg-[#ff3a10] px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6f5f2]"
        >
          Sign up
        </button>
      </header>

      {/* Centered content: light lead-in line + RAG (largest) */}
      <section className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[6vw] pb-[6vh] pt-[9vh] text-center">
        <h1 className="m-0 flex flex-col items-center">
          <FadeIn delay={0.2}>
            <span className=" text-[20px] font-light leading-[1.1] tracking-[0.01em]">
              Build your own
            </span>
          </FadeIn>

          {/* RAG: the biggest element on the page */}
          <FadeIn delay={0.3}>
            <span className="relative mb-[0.2em] mt-[clamp(0.25rem,1.5vh,1rem)] inline-block pb-[0.03em] text-[length:clamp(4.5rem,min(40vw,38vh),22rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
              <span className="bg-[linear-gradient(90deg,#ff3a10_0%,#ff3a10_28%,#ffffff_100%)] bg-clip-text text-transparent">
                RAG
              </span>
              <FreehandUnderline still={still} />
            </span>
          </FadeIn>
          <span className="text-[15px] font-light text-gray-500 mt-10">
            <FadeIn delay={0.4}>
              <span> Upload your document and discuss about the document.</span>
            </FadeIn>
          </span>
        </h1>
      </section>
    </main>
  );
};

export default BuildYourOwnRagHeroDark;
