import {
  Phone,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Layers,
  Mountain,
  Droplets,
  Trees,
  Waves,
  Building2,
  Sprout,
  Truck,
  Ruler,
  CalendarCheck,
  Check,
  Star,
  Mail,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const IMG = "/__mockup/images";

const NAV = ["Services", "Service Areas", "About", "Blog", "Contact"];

const TRUST = [
  { icon: ShieldCheck, label: "Licensed & Insured" },
  { icon: MapPin, label: "Upstate SC + Charlotte NC" },
  { icon: Clock, label: "15+ Years Moving Earth" },
  { icon: Mountain, label: "Large-Acreage Specialists" },
];

const SERVICES = [
  {
    img: "service-grading.png",
    title: "Land Grading & Site Prep",
    desc: "Precision cut-and-fill that levels rough acreage into a buildable, drainable foundation.",
    icon: Ruler,
  },
  {
    img: "service-drainage.png",
    title: "Drainage Solutions",
    desc: "Engineered swales, French drains and retention systems that route water where it belongs.",
    icon: Droplets,
  },
  {
    img: "service-clearing.png",
    title: "Land Clearing & Mulching",
    desc: "Heavy iron clears brush, timber and overgrowth — turned into usable, open ground.",
    icon: Trees,
  },
  {
    img: "service-pond.png",
    title: "Pond Construction & Management",
    desc: "Dig, shape and maintain ponds and waterways built to hold and last for decades.",
    icon: Waves,
  },
  {
    img: "service-commercial.png",
    title: "Commercial Property Maintenance",
    desc: "Dependable, scheduled crews keeping large commercial sites sharp year-round.",
    icon: Building2,
  },
  {
    img: "service-tree.png",
    title: "Tree & Brush Management",
    desc: "Selective removal, trimming and stump grinding to reclaim and protect your land.",
    icon: Sprout,
  },
];

const WHY = [
  {
    icon: Truck,
    title: "Heavy Equipment Fleet",
    desc: "Dozers, excavators, skid steers and graders — owned and operated by our own crews, not subbed out.",
  },
  {
    icon: Mountain,
    title: "Large-Acreage Expertise",
    desc: "Built for farms, estates, HOAs and commercial sites measured in acres, not square feet.",
  },
  {
    icon: Droplets,
    title: "Drainage Engineering",
    desc: "We read the land before we move it — grading and water management designed to work together.",
  },
  {
    icon: CalendarCheck,
    title: "Dependable Scheduling",
    desc: "We show up, communicate clearly and finish on the timeline we promise. Every project.",
  },
];

// Soil-strata diagonal divider
function StrataDivider({
  flip = false,
  from = "#16263d",
  to = "#1d3350",
  bands = ["#c4683f", "#3f7d57"],
}: {
  flip?: boolean;
  from?: string;
  to?: string;
  bands?: string[];
}) {
  return (
    <div
      aria-hidden
      style={{ transform: flip ? "scaleY(-1)" : undefined }}
      className="relative w-full overflow-hidden leading-[0]"
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block h-[60px] w-full md:h-[110px]"
      >
        <polygon points="0,0 1440,55 1440,0" fill={bands[0]} opacity="0.95" />
        <polygon points="0,18 1440,73 1440,55" fill={bands[1]} opacity="0.85" />
        <polygon
          points="0,18 1440,73 1440,120 0,120"
          fill="url(#strataGrad)"
        />
        <defs>
          <linearGradient id="strataGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function Earthwork() {
  const grain =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

  const contour =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cg fill='none' stroke='%23c4683f' stroke-width='1.2' opacity='0.5'%3E%3Cpath d='M-50 300 C 100 220, 200 380, 350 300 S 600 220, 700 300'/%3E%3Cpath d='M-50 340 C 100 260, 200 420, 350 340 S 600 260, 700 340'/%3E%3Cpath d='M-50 380 C 100 300, 200 460, 350 380 S 600 300, 700 380'/%3E%3Cpath d='M-50 260 C 100 180, 200 340, 350 260 S 600 180, 700 260'/%3E%3Cpath d='M-50 220 C 100 140, 200 300, 350 220 S 600 140, 700 220'/%3E%3Cpath d='M-50 420 C 100 340, 200 500, 350 420 S 600 340, 700 420'/%3E%3C/g%3E%3C/svg%3E\")";

  const blue = "hsl(208 64% 40%)";
  const navy = "hsl(215 45% 15%)";
  const clay = "hsl(20 50% 50%)";
  const tan = "hsl(32 42% 62%)";
  const green = "hsl(145 40% 35%)";
  const bone = "hsl(40 20% 98%)";
  const ink = "hsl(215 35% 15%)";

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        color: ink,
        background: bone,
        ["--ew-blue" as string]: blue,
        ["--ew-navy" as string]: navy,
        ["--ew-clay" as string]: clay,
      }}
      className="w-full overflow-x-hidden"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@600;700;800&display=swap');
        .ew-display { font-family: 'Barlow Condensed', 'Barlow', system-ui, sans-serif; letter-spacing: 0.01em; }
        .ew-head { font-family: 'Barlow', system-ui, sans-serif; }
        @keyframes ewRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .ew-rise { animation: ewRise 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        .ew-card { transition: transform .35s cubic-bezier(0.16,1,0.3,1), box-shadow .35s ease, border-color .35s ease; }
        .ew-card:hover { transform: translateY(-8px); box-shadow: 0 28px 50px -22px hsla(215,55%,18%,0.55); border-color: hsl(20 50% 50%); }
        .ew-cta { transition: transform .25s ease, box-shadow .25s ease, background-color .25s ease; }
        .ew-cta:hover { transform: translateY(-2px); }
        .ew-nav-link { position: relative; }
        .ew-nav-link::after { content:''; position:absolute; left:0; bottom:-6px; height:3px; width:0; background: hsl(20 50% 50%); transition: width .3s ease; }
        .ew-nav-link:hover::after { width:100%; }
      `}</style>

      {/* HEADER */}
      <header
        className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
        style={{
          background: "hsla(215,45%,12%,0.94)",
          borderColor: "hsla(20,50%,50%,0.35)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div
              className="ew-display flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-2xl font-900 font-extrabold text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${blue}, ${navy})`,
                boxShadow: `0 6px 16px -4px hsla(208,64%,30%,0.7), inset 0 0 0 2px ${clay}`,
              }}
            >
              P1
            </div>
            <div className="leading-none">
              <div className="ew-display text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">
                Land &amp; Property
              </div>
              <div
                className="ew-display text-[11px] font-bold uppercase tracking-[0.32em]"
                style={{ color: tan }}
              >
                Management
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n}
                href="#"
                className="ew-nav-link text-sm font-semibold uppercase tracking-wide text-white/85 hover:text-white"
              >
                {n}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="tel:7042218928"
              className="hidden items-center gap-2 text-sm font-bold text-white md:flex"
            >
              <Phone className="h-4 w-4" style={{ color: tan }} />
              (704) 221-8928
            </a>
            <Button
              className="ew-cta ew-display hidden h-10 rounded-sm px-5 text-sm font-extrabold uppercase tracking-wider text-white sm:inline-flex"
              style={{
                background: clay,
                boxShadow: `0 8px 20px -6px hsla(20,50%,40%,0.7)`,
              }}
            >
              Get a Free Quote
            </Button>
            <button className="text-white lg:hidden" aria-label="Menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <img
          src={`${IMG}/hero-bg.png`}
          alt="Heavy equipment shaping large acreage"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, hsla(215,50%,10%,0.93) 0%, hsla(215,48%,14%,0.78) 45%, hsla(208,60%,25%,0.45) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: grain, opacity: 0.18 }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: contour, backgroundSize: "640px", opacity: 0.25 }}
        />

        <div className="relative mx-auto max-w-7xl px-5 pb-28 pt-24 md:pb-36 md:pt-32">
          <div className="max-w-3xl">
            <span
              className="ew-display ew-rise mb-5 inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.28em]"
              style={{
                background: "hsla(20,50%,50%,0.18)",
                color: tan,
                border: `1px solid hsla(20,50%,55%,0.5)`,
              }}
            >
              <Layers className="h-3.5 w-3.5" /> Earthwork &amp; Land Management
            </span>
            <h1
              className="ew-display ew-rise text-5xl font-900 font-extrabold uppercase leading-[0.92] text-white sm:text-6xl md:text-7xl"
              style={{ animationDelay: ".08s", textShadow: "0 4px 24px hsla(215,60%,8%,0.6)" }}
            >
              We shape the land
              <br />
              <span style={{ color: tan }}>your property</span> is built on.
            </h1>
            <p
              className="ew-rise mt-6 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl"
              style={{ animationDelay: ".16s" }}
            >
              P1 Land &amp; Property Management brings heavy iron and 15+ years of
              experience to big properties across Upstate SC and the Charlotte
              metro — grading, drainage, clearing, ponds and commercial
              maintenance done right.
            </p>
            <div
              className="ew-rise mt-9 flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: ".24s" }}
            >
              <Button
                className="ew-cta ew-display h-14 rounded-sm px-8 text-base font-extrabold uppercase tracking-wider text-white"
                style={{
                  background: clay,
                  boxShadow: `0 14px 30px -8px hsla(20,50%,40%,0.8)`,
                }}
              >
                Get a Free Quote <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                className="ew-cta ew-display h-14 rounded-sm border-2 bg-transparent px-8 text-base font-extrabold uppercase tracking-wider text-white hover:bg-white/10"
                style={{ borderColor: "hsla(0,0%,100%,0.55)" }}
              >
                <Phone className="h-5 w-5" /> Call (704) 221-8928
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section
        className="relative"
        style={{ background: navy }}
      >
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: grain, opacity: 0.12 }}
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 md:grid-cols-4">
          {TRUST.map((t, i) => (
            <div
              key={t.label}
              className="flex items-center gap-3 py-6 md:justify-center"
              style={{
                borderLeft:
                  i !== 0 ? "1px solid hsla(0,0%,100%,0.08)" : undefined,
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
                style={{ background: "hsla(208,64%,45%,0.22)", color: tan }}
              >
                <t.icon className="h-5 w-5" />
              </span>
              <span className="ew-head text-sm font-bold uppercase leading-tight tracking-wide text-white">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <StrataDivider from={bone} to={bone} bands={[clay, green]} flip />

      {/* SERVICES */}
      <section className="relative mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="mb-12 max-w-2xl">
          <span
            className="ew-display text-sm font-extrabold uppercase tracking-[0.28em]"
            style={{ color: clay }}
          >
            What We Do
          </span>
          <h2 className="ew-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] md:text-5xl">
            Heavy-equipment work for
            <br />
            <span style={{ color: blue }}>serious acreage.</span>
          </h2>
          <p className="mt-4 text-lg text-black/65">
            One contractor for the full scope — from raw clearing to a
            finished, drainable, well-managed property.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <article
              key={s.title}
              className="ew-card group overflow-hidden rounded-md border bg-white"
              style={{
                borderColor: "hsla(215,30%,80%,0.6)",
                boxShadow: "0 14px 30px -24px hsla(215,55%,18%,0.6)",
              }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={`${IMG}/${s.img}`}
                  alt={s.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, hsla(215,50%,12%,0.55), transparent 55%)",
                  }}
                />
                <span
                  className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-sm text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${blue}, ${navy})`,
                    boxShadow: `inset 0 0 0 2px hsla(20,50%,55%,0.6)`,
                  }}
                >
                  <s.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="p-6">
                <h3 className="ew-head text-xl font-extrabold uppercase tracking-wide">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-black/65">
                  {s.desc}
                </p>
                <div
                  className="ew-display mt-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider"
                  style={{ color: clay }}
                >
                  Learn more{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="relative" style={{ background: "hsl(40 25% 95%)" }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: contour, backgroundSize: "720px", opacity: 0.12 }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="relative">
            <div
              className="absolute -left-3 -top-3 h-full w-full rounded-md"
              style={{ background: clay, opacity: 0.9 }}
            />
            <div
              className="absolute -bottom-3 -right-3 h-full w-full rounded-md"
              style={{ background: blue, opacity: 0.25 }}
            />
            <img
              src={`${IMG}/grading-construction.png`}
              alt="Grading for new construction"
              className="relative z-10 h-full max-h-[460px] w-full rounded-md object-cover shadow-2xl"
            />
          </div>
          <div>
            <span
              className="ew-display text-sm font-extrabold uppercase tracking-[0.28em]"
              style={{ color: clay }}
            >
              Site Preparation
            </span>
            <h2 className="ew-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] md:text-5xl">
              Grading for new construction
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-black/70">
              Before the first footing is poured, the ground has to be right. We
              cut, fill and compact large building pads to spec — establishing
              positive drainage, stable sub-grade and clean access so your
              builder hits the ground running.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Engineered cut-and-fill and pad construction",
                "Positive drainage and erosion control built in",
                "GPS-guided fine grading for tight tolerances",
                "Haul roads, laydown yards and site access",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
                    style={{ background: "hsla(145,40%,35%,0.15)", color: green }}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-[15px] font-medium text-black/80">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              className="ew-cta ew-display mt-8 h-12 rounded-sm px-7 text-sm font-extrabold uppercase tracking-wider text-white"
              style={{ background: blue }}
            >
              Talk to our grading team <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <StrataDivider from={navy} to={blue} bands={[clay, green]} />

      {/* WHY P1 */}
      <section
        className="relative"
        style={{ background: `linear-gradient(160deg, ${navy}, hsl(208 55% 22%))` }}
      >
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: grain, opacity: 0.15 }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: contour, backgroundSize: "700px", opacity: 0.18 }}
        />
        <div className="relative mx-auto max-w-7xl px-5 py-16 md:py-24">
          <div className="mb-12 max-w-2xl">
            <span
              className="ew-display text-sm font-extrabold uppercase tracking-[0.28em]"
              style={{ color: tan }}
            >
              Why P1
            </span>
            <h2 className="ew-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-white md:text-5xl">
              Built like the work we do — substantial.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md sm:grid-cols-2 lg:grid-cols-4"
            style={{ background: "hsla(0,0%,100%,0.08)" }}
          >
            {WHY.map((w) => (
              <div
                key={w.title}
                className="group relative p-7"
                style={{ background: "hsla(215,45%,13%,0.65)" }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-sm transition-colors"
                  style={{
                    background: "hsla(20,50%,50%,0.18)",
                    color: tan,
                    border: "1px solid hsla(20,50%,55%,0.45)",
                  }}
                >
                  <w.icon className="h-6 w-6" />
                </span>
                <h3 className="ew-head mt-5 text-lg font-extrabold uppercase tracking-wide text-white">
                  {w.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {w.desc}
                </p>
                <div
                  className="mt-5 h-1 w-10 rounded-full transition-all duration-300 group-hover:w-20"
                  style={{ background: clay }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <StrataDivider from={bone} to={bone} bands={[green, clay]} flip />

      {/* TESTIMONIAL */}
      <section className="relative mx-auto max-w-5xl px-5 py-16 md:py-24">
        <div
          className="relative overflow-hidden rounded-md border bg-white p-9 md:p-14"
          style={{
            borderColor: "hsla(20,50%,55%,0.4)",
            boxShadow: "0 30px 60px -30px hsla(215,55%,18%,0.55)",
          }}
        >
          <div
            className="absolute left-0 top-0 h-full w-2"
            style={{ background: `linear-gradient(${clay}, ${blue})` }}
          />
          <div className="mb-5 flex gap-1" style={{ color: clay }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <blockquote className="ew-head text-2xl font-bold leading-snug md:text-3xl">
            “P1 reshaped 40 acres of our farm — cleared it, fixed years of
            standing-water drainage, and graded it dead level. They run their own
            iron and finished ahead of schedule. The only land crew we’ll call.”
          </blockquote>
          <div className="mt-7 flex items-center gap-4">
            <span
              className="ew-display flex h-12 w-12 items-center justify-center rounded-sm text-lg font-extrabold text-white"
              style={{ background: navy }}
            >
              MR
            </span>
            <div>
              <div className="ew-head font-extrabold uppercase tracking-wide">
                Marcus Reed
              </div>
              <div className="text-sm text-black/60">
                Property Owner · Spartanburg, SC
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative isolate overflow-hidden">
        <img
          src={`${IMG}/commercial-property.png`}
          alt="Large managed property"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(100deg, hsla(215,50%,10%,0.95), hsla(208,60%,28%,0.72))`,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: grain, opacity: 0.16 }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center md:py-28">
          <span
            className="ew-display mb-4 inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.28em]"
            style={{
              background: "hsla(20,50%,50%,0.2)",
              color: tan,
              border: "1px solid hsla(20,50%,55%,0.5)",
            }}
          >
            Free On-Site Estimates
          </span>
          <h2 className="ew-display text-4xl font-extrabold uppercase leading-[0.95] text-white md:text-6xl">
            Got land that needs moving?
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-white/85">
            Tell us about your property and we’ll walk it with you. Serving
            Upstate South Carolina and the greater Charlotte, NC metro.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button
              className="ew-cta ew-display h-14 rounded-sm px-9 text-base font-extrabold uppercase tracking-wider text-white"
              style={{
                background: clay,
                boxShadow: "0 14px 30px -8px hsla(20,50%,40%,0.8)",
              }}
            >
              Get a Free Quote <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              className="ew-cta ew-display h-14 rounded-sm border-2 bg-transparent px-9 text-base font-extrabold uppercase tracking-wider text-white hover:bg-white/10"
              style={{ borderColor: "hsla(0,0%,100%,0.55)" }}
            >
              <Phone className="h-5 w-5" /> (704) 221-8928
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative" style={{ background: "hsl(215 48% 10%)" }}>
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: grain, opacity: 0.1 }}
        />
        <div className="relative mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <div
                  className="ew-display flex h-11 w-11 items-center justify-center rounded-sm text-2xl font-extrabold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${blue}, ${navy})`,
                    boxShadow: `inset 0 0 0 2px ${clay}`,
                  }}
                >
                  P1
                </div>
                <div className="ew-display text-lg font-extrabold uppercase tracking-wide text-white">
                  Land &amp; Property Management
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                Licensed &amp; insured heavy-equipment professionals shaping and
                managing large properties, farms, estates, HOAs and commercial
                sites across the Carolinas.
              </p>
            </div>
            <div>
              <h4
                className="ew-display text-sm font-extrabold uppercase tracking-[0.2em]"
                style={{ color: tan }}
              >
                Contact
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                <li>
                  <a href="tel:7042218928" className="flex items-center gap-2 hover:text-white">
                    <Phone className="h-4 w-4" style={{ color: tan }} /> (704)
                    221-8928
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@p1landmanagement.com"
                    className="flex items-center gap-2 hover:text-white"
                  >
                    <Mail className="h-4 w-4" style={{ color: tan }} />{" "}
                    info@p1landmanagement.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: tan }} /> Upstate SC
                  + Charlotte NC
                </li>
              </ul>
            </div>
            <div>
              <h4
                className="ew-display text-sm font-extrabold uppercase tracking-[0.2em]"
                style={{ color: tan }}
              >
                Company
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                {NAV.map((n) => (
                  <li key={n}>
                    <a href="#" className="hover:text-white">
                      {n}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div
            className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-white/45 sm:flex-row"
            style={{ borderColor: "hsla(0,0%,100%,0.1)" }}
          >
            <span>
              © {new Date().getFullYear()} P1 Land &amp; Property Management ·
              P1LandManagement.com
            </span>
            <span>Licensed &amp; Insured · Serving the Carolinas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Earthwork;
