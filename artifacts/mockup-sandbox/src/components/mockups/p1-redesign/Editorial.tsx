import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  ArrowUpRight,
  ArrowRight,
  Mail,
  MapPin,
  ShieldCheck,
  Check,
  Mountain,
  Droplets,
  Trees,
  Waves,
  Building2,
  Sprout,
  Truck,
  Ruler,
  CalendarCheck,
  Quote,
} from "lucide-react";

const IMG = "/__mockup/images";

const BONE = "hsl(40 22% 97%)";
const BONE_DEEP = "hsl(38 24% 94%)";
const INK = "hsl(215 35% 14%)";
const NAVY = "hsl(215 45% 15%)";
const NAVY_DEEP = "hsl(215 50% 11%)";
const BLUE = "hsl(208 64% 40%)";
const BLUE_BRIGHT = "hsl(206 70% 48%)";
const CLAY = "hsl(20 52% 50%)";
const TAN = "hsl(32 42% 62%)";
const GREEN = "hsl(145 40% 35%)";

const nav = ["Services", "Service Areas", "About", "Blog", "Contact"];

const services = [
  {
    n: "01",
    title: "Land Grading & Site Prep",
    desc: "Precision cut-and-fill that gives every project a true, build-ready foundation.",
    img: "service-grading.png",
    icon: Mountain,
  },
  {
    n: "02",
    title: "Drainage Solutions",
    desc: "Engineered French drains, swales and retention to move water away for good.",
    img: "service-drainage.png",
    icon: Droplets,
  },
  {
    n: "03",
    title: "Land Clearing & Mulching",
    desc: "Selective clearing and forestry mulching that opens up acreage responsibly.",
    img: "service-clearing.png",
    icon: Trees,
  },
  {
    n: "04",
    title: "Pond Construction & Management",
    desc: "Design, excavation and long-term care of ponds and working waterways.",
    img: "service-pond.png",
    icon: Waves,
  },
  {
    n: "05",
    title: "Commercial Property Maintenance",
    desc: "Scheduled, self-sufficient programs that keep large sites pristine year-round.",
    img: "service-commercial.png",
    icon: Building2,
  },
  {
    n: "06",
    title: "Tree & Brush Management",
    desc: "Removal, trimming and stump grinding handled with the right heavy iron.",
    img: "service-tree.png",
    icon: Sprout,
  },
];

const values = [
  {
    n: "01",
    title: "Heavy Equipment Fleet",
    desc: "Owned dozers, excavators and skid steers — no waiting on rentals, no shortcuts on the hard parts.",
    icon: Truck,
  },
  {
    n: "02",
    title: "Large-Acreage Expertise",
    desc: "Built around properties most crews can't handle — farms, estates, HOAs and commercial sites.",
    icon: Ruler,
  },
  {
    n: "03",
    title: "Drainage Engineering",
    desc: "We read the land's slope and water like a survey, then solve it at the grade level.",
    icon: Droplets,
  },
  {
    n: "04",
    title: "Dependable Scheduling",
    desc: "Crews that show up, communicate and finish on the timeline we commit to.",
    icon: CalendarCheck,
  },
];

const trust = [
  { label: "Licensed & Insured", icon: ShieldCheck },
  { label: "Upstate SC + Charlotte NC", icon: MapPin },
  { label: "15+ Years", icon: CalendarCheck },
  { label: "Large-Acreage Specialists", icon: Mountain },
];

// Topographic contour SVG used as a layered land motif
function ContourField({
  stroke,
  opacity = 0.5,
}: {
  stroke: string;
  opacity?: number;
}) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 800 600"
      fill="none"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <path
          key={i}
          d={`M-40 ${90 + i * 58} C 160 ${30 + i * 58}, 320 ${160 + i * 58}, 480 ${
            90 + i * 58
          } S 760 ${20 + i * 58}, 880 ${110 + i * 58}`}
          stroke={stroke}
          strokeWidth={i % 3 === 0 ? 1.4 : 0.8}
        />
      ))}
    </svg>
  );
}

export function Editorial() {
  useEffect(() => {
    const id = "p1-editorial-fonts";
    if (document.getElementById(id)) return;
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..700&family=Barlow:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap";
    document.head.append(preconnect1, preconnect2, link);
  }, []);

  const display = "'Fraunces', Georgia, serif";
  const head = "'Barlow', system-ui, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  const Kicker = ({ children }: { children: React.ReactNode }) => (
    <span
      className="inline-flex items-center gap-2 text-[11px] font-bold uppercase"
      style={{ color: CLAY, fontFamily: head, letterSpacing: "0.28em" }}
    >
      <span
        className="inline-block h-px w-7"
        style={{ background: CLAY }}
      />
      {children}
    </span>
  );

  return (
    <div
      style={{
        background: BONE,
        color: INK,
        fontFamily: body,
        ["--blue" as string]: BLUE,
      }}
      className="min-h-screen w-full overflow-x-hidden"
    >
      {/* ============ HEADER ============ */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          borderColor: "hsl(215 30% 15% / 0.10)",
          background: "hsl(40 22% 97% / 0.86)",
        }}
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-3.5">
          <a href="#top" className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[3px] text-lg font-black"
              style={{
                background: NAVY,
                color: "white",
                fontFamily: head,
                boxShadow: `0 8px 20px -8px ${NAVY}`,
              }}
            >
              P1
            </div>
            <div className="leading-none">
              <div
                className="text-[15px] font-extrabold tracking-tight"
                style={{ fontFamily: head, color: INK }}
              >
                LAND &amp; PROPERTY
              </div>
              <div
                className="text-[10px] font-semibold uppercase"
                style={{ letterSpacing: "0.34em", color: CLAY }}
              >
                Management
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => (
              <a
                key={item}
                href="#"
                className="group relative text-[13px] font-semibold transition-colors"
                style={{ color: INK, fontFamily: head }}
              >
                {item}
                <span
                  className="absolute -bottom-1.5 left-0 h-[2px] w-0 transition-all duration-300 group-hover:w-full"
                  style={{ background: CLAY }}
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="tel:7042218928"
              className="hidden items-center gap-2 text-sm font-bold md:flex"
              style={{ color: BLUE, fontFamily: head }}
            >
              <Phone className="h-4 w-4" />
              (704) 221-8928
            </a>
            <Button
              className="rounded-[3px] border-0 font-bold"
              style={{
                background: BLUE,
                color: "white",
                fontFamily: head,
                boxShadow: `0 10px 22px -10px ${BLUE}`,
              }}
            >
              Get a Free Quote
            </Button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section id="top" className="relative overflow-hidden" style={{ background: NAVY_DEEP }}>
        <div className="absolute inset-0">
          <img
            src={`${IMG}/hero-bg.png`}
            alt="Heavy equipment shaping large acreage"
            className="h-full w-full object-cover"
            style={{ opacity: 0.5 }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, ${NAVY_DEEP} 8%, hsl(215 50% 11% / 0.86) 38%, hsl(215 50% 11% / 0.35) 72%, transparent 100%)`,
          }}
        />
        <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
          <ContourField stroke={TAN} opacity={0.5} />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background: `linear-gradient(to bottom, transparent, ${BONE})`,
          }}
        />

        <div className="relative mx-auto grid max-w-[1240px] grid-cols-12 gap-8 px-6 pb-28 pt-24 lg:pt-28">
          <div className="col-span-12 lg:col-span-8">
            <div className="mb-7 flex items-center gap-4">
              <Kicker>The Land Specialists · Est. 2009</Kicker>
            </div>
            <h1
              className="max-w-3xl text-[clamp(2.6rem,6.4vw,5.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-white"
              style={{ fontFamily: display }}
            >
              We shape the land{" "}
              <em
                className="not-italic font-semibold"
                style={{ color: TAN, fontStyle: "italic" }}
              >
                your property
              </em>{" "}
              is built on.
            </h1>
            <p
              className="mt-7 max-w-xl text-lg leading-relaxed"
              style={{ color: "hsl(40 20% 92% / 0.82)" }}
            >
              Grading, drainage, clearing and ponds for big properties across
              Upstate South Carolina and the Charlotte metro. Heavy-equipment
              professionals for farms, estates, HOAs and commercial sites.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="group rounded-[3px] border-0 px-7 text-[15px] font-bold"
                style={{
                  background: BLUE,
                  color: "white",
                  fontFamily: head,
                  boxShadow: `0 18px 40px -14px ${BLUE_BRIGHT}`,
                }}
              >
                Get a Free Quote
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
              <a
                href="tel:7042218928"
                className="inline-flex items-center gap-2 rounded-[3px] border px-7 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
                style={{ borderColor: "hsl(40 30% 90% / 0.35)", fontFamily: head }}
              >
                <Phone className="h-4 w-4" />
                Call (704) 221-8928
              </a>
            </div>
          </div>

          {/* Editorial index column */}
          <div className="col-span-12 hidden lg:col-span-4 lg:flex lg:items-end lg:justify-end">
            <div
              className="w-full max-w-[260px] border-l pl-6"
              style={{ borderColor: "hsl(40 30% 90% / 0.22)" }}
            >
              <div
                className="mb-5 text-[10px] font-bold uppercase"
                style={{ color: TAN, letterSpacing: "0.3em", fontFamily: head }}
              >
                Index of Work
              </div>
              {[
                ["01", "Grading"],
                ["02", "Drainage"],
                ["03", "Clearing"],
                ["04", "Ponds"],
              ].map(([n, t]) => (
                <div
                  key={n}
                  className="flex items-baseline justify-between border-b py-2.5"
                  style={{ borderColor: "hsl(40 30% 90% / 0.14)" }}
                >
                  <span
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: TAN, fontFamily: head }}
                  >
                    {n}
                  </span>
                  <span
                    className="text-sm font-medium text-white/90"
                    style={{ fontFamily: head }}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section style={{ background: BONE }}>
        <div className="mx-auto max-w-[1240px] px-6">
          <div
            className="-mt-10 grid grid-cols-2 overflow-hidden rounded-[4px] border bg-white md:grid-cols-4"
            style={{
              borderColor: "hsl(215 30% 15% / 0.08)",
              boxShadow: `0 30px 60px -32px ${NAVY}, 0 8px 18px -12px hsl(215 40% 20% / 0.3)`,
            }}
          >
            {trust.map((t, i) => (
              <div
                key={t.label}
                className="flex items-center gap-3 px-6 py-6"
                style={{
                  borderRight:
                    i < trust.length - 1
                      ? "1px solid hsl(215 30% 15% / 0.07)"
                      : "none",
                }}
              >
                <t.icon className="h-5 w-5 shrink-0" style={{ color: BLUE }} />
                <span
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: INK, fontFamily: head }}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SERVICES ============ */}
      <section className="relative py-24" style={{ background: BONE }}>
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Kicker>What We Do</Kicker>
              <h2
                className="mt-4 max-w-2xl text-[clamp(2rem,4.2vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em]"
                style={{ fontFamily: display, color: INK }}
              >
                A full field of capabilities,
                <br />
                <span style={{ color: BLUE }}>one accountable crew.</span>
              </h2>
            </div>
            <p className="max-w-xs text-[15px] leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
              From the first cut to ongoing care, every service is run in-house
              with owned equipment and a single point of contact.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <article
                key={s.n}
                className="group relative overflow-hidden rounded-[4px] border bg-white transition-all duration-300"
                style={{
                  borderColor: "hsl(215 30% 15% / 0.08)",
                  boxShadow: `0 1px 0 hsl(215 30% 15% / 0.04)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 34px 60px -30px ${NAVY}, 0 10px 22px -16px hsl(215 40% 22% / 0.4)`;
                  e.currentTarget.style.transform = "translateY(-6px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 1px 0 hsl(215 30% 15% / 0.04)`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={`${IMG}/${s.img}`}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, hsl(215 50% 11% / 0.55), transparent 55%)`,
                    }}
                  />
                  <span
                    className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-[3px] text-xs font-bold tabular-nums backdrop-blur"
                    style={{
                      background: "hsl(40 22% 97% / 0.92)",
                      color: BLUE,
                      fontFamily: head,
                    }}
                  >
                    {s.n}
                  </span>
                  <s.icon
                    className="absolute bottom-4 right-4 h-6 w-6 text-white/90"
                  />
                </div>
                <div className="p-6">
                  <h3
                    className="text-xl font-bold tracking-tight"
                    style={{ fontFamily: head, color: INK }}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "hsl(215 18% 38%)" }}>
                    {s.desc}
                  </p>
                  <div
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ color: CLAY, letterSpacing: "0.12em", fontFamily: head }}
                  >
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                  style={{ background: CLAY }}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURE ROW ============ */}
      <section className="relative overflow-hidden py-24" style={{ background: BONE_DEEP }}>
        <div className="absolute inset-0 opacity-[0.5]">
          <ContourField stroke={TAN} opacity={0.16} />
        </div>
        <div className="relative mx-auto grid max-w-[1240px] grid-cols-12 items-center gap-10 px-6">
          {/* Overlapping framed image */}
          <div className="col-span-12 lg:col-span-7">
            <div className="relative">
              <div
                className="absolute -left-4 -top-4 h-full w-full rounded-[4px]"
                style={{ background: BLUE, opacity: 0.9 }}
              />
              <div
                className="absolute -bottom-5 -right-5 h-28 w-28 rounded-[4px]"
                style={{ background: CLAY }}
              />
              <div
                className="relative overflow-hidden rounded-[4px] border-4 border-white"
                style={{ boxShadow: `0 40px 70px -34px ${NAVY}` }}
              >
                <img
                  src={`${IMG}/grading-construction.png`}
                  alt="Grading for new construction"
                  className="h-[420px] w-full object-cover"
                />
              </div>
              <div
                className="absolute -bottom-6 left-8 z-10 rounded-[3px] px-5 py-4 text-white"
                style={{
                  background: NAVY,
                  boxShadow: `0 20px 40px -18px ${NAVY}`,
                }}
              >
                <div
                  className="text-3xl font-black leading-none"
                  style={{ fontFamily: head, color: TAN }}
                >
                  ±0.1"
                </div>
                <div
                  className="mt-1 text-[10px] font-semibold uppercase"
                  style={{ letterSpacing: "0.22em", color: "white" }}
                >
                  Grade tolerance
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 lg:pl-6">
            <Kicker>Feature · 05</Kicker>
            <h2
              className="mt-4 text-[clamp(1.9rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: display, color: INK }}
            >
              Grading for New Construction
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "hsl(215 20% 34%)" }}>
              Before the first footing is poured, the pad has to be right. We
              deliver compacted, properly sloped building pads and site grades
              that pass inspection and keep water moving exactly where it
              should — protecting the structures that follow for decades.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Engineered cut-and-fill balancing",
                "Pad compaction & sub-grade prep",
                "Positive drainage built into every grade",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "hsl(145 40% 35% / 0.14)" }}
                  >
                    <Check className="h-3 w-3" style={{ color: GREEN }} />
                  </span>
                  <span className="text-[14px] font-medium" style={{ color: INK }}>
                    {t}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <a
                href="#"
                className="inline-flex items-center gap-2 text-sm font-bold uppercase"
                style={{ color: BLUE, letterSpacing: "0.1em", fontFamily: head }}
              >
                Explore site prep
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY P1 ============ */}
      <section className="relative overflow-hidden py-24" style={{ background: NAVY }}>
        <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
          <ContourField stroke={TAN} opacity={0.4} />
        </div>
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "hsl(40 30% 90% / 0.1)" }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4">
              <Kicker>Why P1</Kicker>
              <h2
                className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.03] tracking-[-0.02em] text-white"
                style={{ fontFamily: display }}
              >
                The difference is in the{" "}
                <span style={{ color: TAN, fontStyle: "italic" }}>
                  groundwork.
                </span>
              </h2>
              <p
                className="mt-5 max-w-sm text-[15px] leading-relaxed"
                style={{ color: "hsl(40 20% 92% / 0.7)" }}
              >
                Owners choose P1 because we bring the equipment, expertise and
                discipline that big properties demand — and we stand behind
                every grade we cut.
              </p>
              <div
                className="mt-8 inline-flex items-center gap-2 rounded-[3px] px-4 py-2 text-[12px] font-bold uppercase"
                style={{
                  background: "hsl(145 40% 35% / 0.18)",
                  color: "hsl(145 45% 70%)",
                  letterSpacing: "0.16em",
                  fontFamily: head,
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                Licensed &amp; Insured
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[4px] sm:grid-cols-2"
                style={{ background: "hsl(40 30% 90% / 0.1)" }}
              >
                {values.map((v) => (
                  <div
                    key={v.n}
                    className="group relative p-8 transition-colors"
                    style={{ background: NAVY_DEEP }}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-[3px]"
                        style={{ background: "hsl(208 64% 40% / 0.18)" }}
                      >
                        <v.icon className="h-5 w-5" style={{ color: BLUE_BRIGHT }} />
                      </span>
                      <span
                        className="text-2xl font-black tabular-nums"
                        style={{
                          color: "hsl(40 30% 90% / 0.16)",
                          fontFamily: head,
                        }}
                      >
                        {v.n}
                      </span>
                    </div>
                    <h3
                      className="mt-5 text-lg font-bold text-white"
                      style={{ fontFamily: head }}
                    >
                      {v.title}
                    </h3>
                    <p
                      className="mt-2 text-[14px] leading-relaxed"
                      style={{ color: "hsl(40 20% 92% / 0.66)" }}
                    >
                      {v.desc}
                    </p>
                    <span
                      className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-300 group-hover:w-full"
                      style={{ background: CLAY }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIAL ============ */}
      <section className="relative py-24" style={{ background: BONE }}>
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="grid grid-cols-12 items-center gap-10">
            <div className="col-span-12 md:col-span-5">
              <div className="relative">
                <div
                  className="absolute -left-3 -top-3 h-full w-full rounded-[4px]"
                  style={{ background: CLAY, opacity: 0.9 }}
                />
                <div
                  className="relative overflow-hidden rounded-[4px] border-4 border-white"
                  style={{ boxShadow: `0 30px 60px -28px ${NAVY}` }}
                >
                  <img
                    src={`${IMG}/commercial-property.png`}
                    alt="Managed commercial property"
                    className="h-[340px] w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7 md:pl-4">
              <Quote className="h-10 w-10" style={{ color: TAN }} />
              <blockquote
                className="mt-5 text-[clamp(1.4rem,2.6vw,2rem)] font-light leading-[1.25] tracking-[-0.01em]"
                style={{ fontFamily: display, color: INK }}
              >
                "P1 took over our 40-acre commercial park and fixed drainage
                issues we'd fought for years. Their crew is completely
                self-sufficient — and the grade work is flawless."
              </blockquote>
              <div className="mt-7 flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ background: BLUE, fontFamily: head }}
                >
                  MT
                </div>
                <div>
                  <div className="font-bold" style={{ color: INK, fontFamily: head }}>
                    Marcus T.
                  </div>
                  <div className="text-[13px]" style={{ color: "hsl(215 18% 42%)" }}>
                    Property Manager · Spartanburg, SC
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section className="relative overflow-hidden" style={{ background: NAVY_DEEP }}>
        <div className="absolute inset-0">
          <img
            src={`${IMG}/fine-grading.png`}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            style={{ opacity: 0.22 }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(100deg, ${NAVY_DEEP} 30%, hsl(208 64% 40% / 0.4))`,
          }}
        />
        <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
          <ContourField stroke={TAN} opacity={0.45} />
        </div>
        <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-8 px-6 py-20 text-center">
          <Kicker>Start the Conversation</Kicker>
          <h2
            className="max-w-3xl text-[clamp(2.2rem,4.6vw,3.8rem)] font-light leading-[1.02] tracking-[-0.02em] text-white"
            style={{ fontFamily: display }}
          >
            Have acreage that needs shaping? Let's walk it together.
          </h2>
          <p className="max-w-xl text-lg" style={{ color: "hsl(40 20% 92% / 0.78)" }}>
            Free, no-pressure quotes across Upstate SC and the Charlotte metro.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="group rounded-[3px] border-0 px-8 text-[15px] font-bold"
              style={{
                background: "white",
                color: NAVY,
                fontFamily: head,
                boxShadow: `0 18px 40px -16px hsl(0 0% 0% / 0.5)`,
              }}
            >
              Get a Free Quote
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
            <a
              href="tel:7042218928"
              className="inline-flex items-center gap-2 rounded-[3px] border px-8 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              style={{ borderColor: "hsl(40 30% 90% / 0.4)", fontFamily: head }}
            >
              <Phone className="h-4 w-4" />
              Call (704) 221-8928
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: NAVY }}>
        <div className="mx-auto max-w-[1240px] px-6 py-16">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 md:col-span-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[3px] text-lg font-black text-white"
                  style={{ background: BLUE, fontFamily: head }}
                >
                  P1
                </div>
                <div className="leading-none">
                  <div
                    className="text-[15px] font-extrabold tracking-tight text-white"
                    style={{ fontFamily: head }}
                  >
                    LAND &amp; PROPERTY
                  </div>
                  <div
                    className="text-[10px] font-semibold uppercase"
                    style={{ letterSpacing: "0.34em", color: TAN }}
                  >
                    Management
                  </div>
                </div>
              </div>
              <p
                className="mt-5 max-w-xs text-[14px] leading-relaxed"
                style={{ color: "hsl(40 20% 92% / 0.6)" }}
              >
                Heavy-equipment land &amp; property professionals for big
                properties, farms, estates, HOAs and commercial sites.
              </p>
            </div>

            <div className="col-span-6 md:col-span-3">
              <div
                className="mb-4 text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.2em", color: TAN, fontFamily: head }}
              >
                Explore
              </div>
              <ul className="space-y-2.5">
                {nav.map((n) => (
                  <li key={n}>
                    <a
                      href="#"
                      className="text-[14px] transition-colors hover:text-white"
                      style={{ color: "hsl(40 20% 92% / 0.7)" }}
                    >
                      {n}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-6 md:col-span-4">
              <div
                className="mb-4 text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.2em", color: TAN, fontFamily: head }}
              >
                Get in Touch
              </div>
              <ul className="space-y-3">
                <li>
                  <a
                    href="tel:7042218928"
                    className="flex items-center gap-3 text-[14px] font-semibold text-white"
                  >
                    <Phone className="h-4 w-4" style={{ color: BLUE_BRIGHT }} />
                    (704) 221-8928
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@p1landmanagement.com"
                    className="flex items-center gap-3 text-[14px]"
                    style={{ color: "hsl(40 20% 92% / 0.8)" }}
                  >
                    <Mail className="h-4 w-4" style={{ color: BLUE_BRIGHT }} />
                    info@p1landmanagement.com
                  </a>
                </li>
                <li
                  className="flex items-start gap-3 text-[14px]"
                  style={{ color: "hsl(40 20% 92% / 0.8)" }}
                >
                  <MapPin className="mt-0.5 h-4 w-4" style={{ color: BLUE_BRIGHT }} />
                  Upstate South Carolina &amp; the Charlotte, NC metro
                </li>
              </ul>
            </div>
          </div>

          <div
            className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-[12px] sm:flex-row"
            style={{ borderColor: "hsl(40 30% 90% / 0.12)", color: "hsl(40 20% 92% / 0.5)" }}
          >
            <span>© {new Date().getFullYear()} P1 Land &amp; Property Management. All rights reserved.</span>
            <span style={{ fontFamily: head, letterSpacing: "0.1em" }}>
              P1LandManagement.com
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Editorial;
