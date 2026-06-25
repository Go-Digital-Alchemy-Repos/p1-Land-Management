import { Button } from "@/components/ui/button";
import {
  Phone,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Mountain,
  Tractor,
  Droplets,
  Trees,
  Waves,
  Building2,
  Sprout,
  Layers,
  Ruler,
  CalendarCheck,
  Check,
  Star,
  Quote,
  Mail,
} from "lucide-react";

const BLUE = "hsl(208 64% 40%)";
const BLUE_DEEP = "hsl(208 70% 32%)";
const NAVY = "hsl(215 45% 15%)";
const NAVY_DEEP = "hsl(215 48% 9%)";
const GREEN = "hsl(145 40% 35%)";
const CLAY = "hsl(20 50% 50%)";
const TAN = "hsl(32 42% 62%)";
const BONE = "hsl(40 20% 98%)";
const INK = "hsl(215 35% 15%)";

const nav = ["Services", "Service Areas", "About", "Blog", "Contact"];

const services = [
  {
    title: "Land Grading & Site Prep",
    desc: "Precision cut-and-fill to shape pads, slopes, and building sites.",
    img: "service-grading.png",
    icon: Tractor,
  },
  {
    title: "Drainage Solutions",
    desc: "Engineered French drains, swales, and retention that move water right.",
    img: "service-drainage.png",
    icon: Droplets,
  },
  {
    title: "Land Clearing & Mulching",
    desc: "Selective clearing and forestry mulching across heavy acreage.",
    img: "service-clearing.png",
    icon: Trees,
  },
  {
    title: "Pond Construction & Management",
    desc: "New ponds, dredging, and ongoing water-quality management.",
    img: "service-pond.png",
    icon: Waves,
  },
  {
    title: "Commercial Property Maintenance",
    desc: "Dependable scheduled upkeep for HOAs, campuses, and sites.",
    img: "service-commercial.png",
    icon: Building2,
  },
  {
    title: "Tree & Brush Management",
    desc: "Removal, trimming, and brush control to keep land usable.",
    img: "service-tree.png",
    icon: Sprout,
  },
];

const why = [
  {
    icon: Layers,
    title: "Heavy Equipment Fleet",
    desc: "Dozers, excavators, and graders owned in-house — no waiting on rentals, no subcontracting the hard parts.",
  },
  {
    icon: Mountain,
    title: "Large-Acreage Expertise",
    desc: "We built our business on properties most contractors can't handle: farms, estates, HOAs, and commercial sites.",
  },
  {
    icon: Ruler,
    title: "Drainage Engineering",
    desc: "We read the land's contours and grade for water — solving erosion and standing-water problems for good.",
  },
  {
    icon: CalendarCheck,
    title: "Dependable Scheduling",
    desc: "Crews show up when promised and finish on plan, so your project and your property stay on track.",
  },
];

const trust = [
  { icon: ShieldCheck, label: "Licensed & Insured" },
  { icon: MapPin, label: "Upstate SC + Charlotte NC" },
  { icon: Clock, label: "15+ Years Experience" },
  { icon: Mountain, label: "Large-Acreage Specialists" },
];

const fontStack =
  "'Inter', ui-sans-serif, system-ui, sans-serif";
const displayStack =
  "'Barlow', 'Inter', ui-sans-serif, system-ui, sans-serif";

const contourSvg = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='760' height='520' viewBox='0 0 760 520'>
  <g fill='none' stroke='white' stroke-width='1.1' opacity='0.5'>
    <path d='M-40 120 C 140 40, 320 200, 500 120 S 820 40, 900 140'/>
    <path d='M-40 170 C 150 90, 330 250, 510 170 S 820 90, 900 190'/>
    <path d='M-40 220 C 160 140, 340 300, 520 220 S 820 140, 900 240'/>
    <path d='M-40 270 C 170 190, 350 350, 530 270 S 820 190, 900 290'/>
    <path d='M-40 320 C 180 240, 360 400, 540 320 S 820 240, 900 340'/>
    <path d='M-40 370 C 190 290, 370 450, 550 370 S 820 290, 900 390'/>
    <path d='M-40 420 C 200 340, 380 500, 560 420 S 820 340, 900 440'/>
  </g>
</svg>
`);

function Eyebrow({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        style={{ background: CLAY }}
        className="h-px w-7"
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{
          fontFamily: displayStack,
          color: dark ? TAN : CLAY,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function Topographic() {
  return (
    <div
      style={{
        fontFamily: fontStack,
        color: INK,
        background: BONE,
      }}
      className="min-h-screen w-full antialiased"
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
      />

      {/* HEADER */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          borderColor: "hsl(215 25% 88%)",
          background: "hsla(40, 20%, 98%, 0.88)",
        }}
      >
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-md text-base font-extrabold text-white shadow-sm"
              style={{
                fontFamily: displayStack,
                background: `linear-gradient(150deg, ${BLUE} 0%, ${NAVY} 100%)`,
                boxShadow: "0 6px 16px -6px hsla(215,45%,15%,0.5)",
              }}
            >
              P1
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span
                className="text-[13px] font-extrabold tracking-tight"
                style={{ fontFamily: displayStack, color: NAVY }}
              >
                LAND &amp; PROPERTY
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: BLUE }}
              >
                Management
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map((n) => (
              <a
                key={n}
                href="#"
                className="text-sm font-medium transition-colors"
                style={{ color: INK }}
                onMouseEnter={(e) => (e.currentTarget.style.color = BLUE)}
                onMouseLeave={(e) => (e.currentTarget.style.color = INK)}
              >
                {n}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="tel:7042218928"
              className="hidden items-center gap-2 text-sm font-semibold md:flex"
              style={{ color: NAVY }}
            >
              <Phone className="h-4 w-4" style={{ color: BLUE }} />
              (704) 221-8928
            </a>
            <Button
              className="h-9 rounded-md border-0 text-white shadow-sm"
              style={{
                background: BLUE,
                boxShadow: "0 8px 18px -8px hsla(208,64%,40%,0.7)",
              }}
            >
              Get a Free Quote
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/__mockup/images/hero-bg.png"
            alt="Large acreage shaped by P1 heavy equipment"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, hsla(215,48%,9%,0.93) 0%, hsla(215,45%,15%,0.82) 42%, hsla(208,64%,30%,0.45) 100%)`,
            }}
          />
          {/* contour watermark */}
          <div
            className="absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage: `url("data:image/svg+xml,${contourSvg}")`,
              backgroundSize: "760px 520px",
              backgroundPosition: "right -40px top -20px",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
          <div className="max-w-2xl">
            <Eyebrow dark>Upstate SC &amp; Charlotte NC</Eyebrow>
            <h1
              className="mt-6 text-4xl font-extrabold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: displayStack }}
            >
              We shape the land your
              <br />
              property is{" "}
              <span style={{ color: TAN }}>built on.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              P1 Land &amp; Property Management is the heavy-equipment partner
              for large acreage — grading, drainage, clearing, ponds, and
              commercial maintenance across the Carolinas.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="h-12 rounded-md border-0 px-7 text-base font-semibold text-white"
                style={{
                  background: BLUE,
                  boxShadow: "0 14px 30px -10px hsla(208,64%,40%,0.8)",
                }}
              >
                Get a Free Quote
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-md border px-7 text-base font-semibold text-white"
                style={{
                  borderColor: "hsla(0,0%,100%,0.35)",
                  background: "hsla(0,0%,100%,0.06)",
                }}
                asChild
              >
                <a href="tel:7042218928">
                  <Phone className="h-4 w-4" />
                  Call (704) 221-8928
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* strata divider */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5"
          style={{
            background: `linear-gradient(90deg, ${CLAY} 0%, ${TAN} 30%, ${GREEN} 65%, ${BLUE} 100%)`,
          }}
        />
      </section>

      {/* TRUST STRIP */}
      <section
        className="border-b"
        style={{ background: "white", borderColor: "hsl(215 25% 90%)" }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 lg:grid-cols-4 lg:px-8">
          {trust.map((t, i) => (
            <div
              key={t.label}
              className="flex items-center gap-3 py-6"
              style={{
                borderLeft:
                  i === 0 ? "none" : "1px solid hsl(215 25% 92%)",
                paddingLeft: i === 0 ? 0 : "1.25rem",
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: "hsl(208 64% 96%)",
                  color: BLUE,
                }}
              >
                <t.icon className="h-5 w-5" />
              </span>
              <span
                className="text-sm font-semibold leading-tight"
                style={{ color: NAVY }}
              >
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="max-w-2xl">
          <Eyebrow>What We Do</Eyebrow>
          <h2
            className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ fontFamily: displayStack, color: NAVY }}
          >
            Full-scope land &amp; property contracting
          </h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: "hsl(215 20% 38%)" }}>
            One licensed crew for the heavy work — from the first cut to ongoing
            management of your acreage.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.title}
              className="group overflow-hidden rounded-xl bg-white transition-all duration-300"
              style={{
                border: "1px solid hsl(215 25% 91%)",
                boxShadow:
                  "0 1px 2px hsla(215,45%,15%,0.04), 0 14px 30px -18px hsla(215,45%,15%,0.28)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 8px hsla(215,45%,15%,0.06), 0 24px 44px -16px hsla(215,45%,15%,0.4)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 1px 2px hsla(215,45%,15%,0.04), 0 14px 30px -18px hsla(215,45%,15%,0.28)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={`/__mockup/images/${s.img}`}
                  alt={s.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 45%, hsla(215,48%,9%,0.55) 100%)",
                  }}
                />
                <span
                  className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-white backdrop-blur-sm"
                  style={{ background: "hsla(208,64%,40%,0.9)" }}
                >
                  <s.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </span>
              </div>
              <div className="p-6">
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: displayStack, color: NAVY }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "hsl(215 20% 42%)" }}>
                  {s.desc}
                </p>
                <a
                  href="#"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: BLUE }}
                >
                  Learn more
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="relative overflow-hidden" style={{ background: "white" }}>
        <div
          className="absolute inset-y-0 right-0 w-1/2 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${contourSvg.replace(/white/g, "%23194a7a")}")`,
            backgroundSize: "760px 520px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-2 lg:px-8">
          <div className="relative">
            <div
              className="absolute -left-4 -top-4 hidden h-full w-full rounded-2xl lg:block"
              style={{ background: `linear-gradient(135deg, ${TAN} 0%, ${CLAY} 100%)`, opacity: 0.18 }}
            />
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                boxShadow: "0 30px 60px -24px hsla(215,45%,15%,0.45)",
              }}
            >
              <img
                src="/__mockup/images/grading-construction.png"
                alt="Grading for new construction"
                className="h-[420px] w-full object-cover"
              />
            </div>
          </div>

          <div>
            <Eyebrow>Site Preparation</Eyebrow>
            <h2
              className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl"
              style={{ fontFamily: displayStack, color: NAVY }}
            >
              Grading for new construction
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: "hsl(215 20% 38%)" }}>
              Before the first footing is poured, the ground has to be right. We
              cut, fill, and compact building pads to spec — establishing the
              elevations and slopes that protect your investment for decades.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Laser-guided cut-and-fill to engineered elevations",
                "Proper compaction and soil stabilization",
                "Positive drainage built in from day one",
                "Pad, road, and utility-trench preparation",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "hsl(145 40% 92%)", color: GREEN }}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-[15px]" style={{ color: INK }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="mt-8 h-12 rounded-md border-0 px-7 text-base font-semibold text-white"
              style={{
                background: NAVY,
                boxShadow: "0 14px 28px -12px hsla(215,45%,15%,0.7)",
              }}
            >
              Plan your site prep
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* WHY P1 — dark navy with contour watermark */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${contourSvg}")`,
            backgroundSize: "900px 620px",
            backgroundRepeat: "repeat",
          }}
        />
        <div
          className="absolute left-0 right-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${BLUE} 0%, ${GREEN} 50%, ${CLAY} 100%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow dark>Why P1</Eyebrow>
            <h2
              className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: displayStack }}
            >
              The crew large properties rely on
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              We own the iron, we read the land, and we show up — the
              difference between a contractor and a partner.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
            {why.map((w, i) => (
              <div key={w.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
                    style={{
                      background: `linear-gradient(150deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)`,
                      boxShadow: "0 12px 26px -12px hsla(208,64%,40%,0.9)",
                    }}
                  >
                    <w.icon className="h-5.5 w-5.5" style={{ width: 22, height: 22 }} />
                  </span>
                  {i < why.length - 1 && (
                    <span className="mt-3 hidden h-full w-px bg-white/10 sm:block" />
                  )}
                </div>
                <div className="pb-2">
                  <h3
                    className="text-lg font-bold text-white"
                    style={{ fontFamily: displayStack }}
                  >
                    {w.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/65">
                    {w.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto max-w-5xl px-5 py-24 lg:px-8">
        <div
          className="relative overflow-hidden rounded-2xl bg-white p-10 lg:p-14"
          style={{
            border: "1px solid hsl(215 25% 91%)",
            boxShadow: "0 30px 60px -28px hsla(215,45%,15%,0.4)",
          }}
        >
          <div
            className="absolute left-0 top-0 h-full w-1.5"
            style={{ background: `linear-gradient(180deg, ${BLUE} 0%, ${CLAY} 100%)` }}
          />
          <Quote className="h-10 w-10" style={{ color: "hsl(208 64% 88%)" }} />
          <div className="mt-4 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5" style={{ color: CLAY, fill: CLAY }} />
            ))}
          </div>
          <blockquote
            className="mt-5 text-2xl font-medium leading-snug sm:text-[28px]"
            style={{ fontFamily: displayStack, color: NAVY }}
          >
            "P1 graded and drained 60 acres of pasture that had flooded every
            spring for years. Their equipment and their crew are first-rate — the
            water problem is simply gone."
          </blockquote>
          <div className="mt-7 flex items-center gap-4">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full font-bold text-white"
              style={{ background: NAVY, fontFamily: displayStack }}
            >
              JM
            </span>
            <div>
              <div className="font-semibold" style={{ color: NAVY }}>
                James Macklin
              </div>
              <div className="text-sm" style={{ color: "hsl(215 20% 45%)" }}>
                Estate Owner · Spartanburg County, SC
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative overflow-hidden">
        <img
          src="/__mockup/images/fine-grading.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(100deg, hsla(215,48%,9%,0.95) 0%, hsla(208,64%,32%,0.82) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${contourSvg}")`,
            backgroundSize: "760px 520px",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <Eyebrow dark>Free On-Site Assessment</Eyebrow>
              <h2
                className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                style={{ fontFamily: displayStack }}
              >
                Ready to shape your property?
              </h2>
              <p className="mt-4 text-lg text-white/75">
                Tell us about your acreage and we'll walk the site, talk through
                options, and send a clear quote.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-md border-0 px-7 text-base font-semibold text-white"
                style={{
                  background: BLUE,
                  boxShadow: "0 14px 30px -10px hsla(208,64%,40%,0.9)",
                }}
              >
                Get a Free Quote
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-md border px-7 text-base font-semibold text-white"
                style={{
                  borderColor: "hsla(0,0%,100%,0.4)",
                  background: "hsla(0,0%,100%,0.08)",
                }}
                asChild
              >
                <a href="tel:7042218928">
                  <Phone className="h-4 w-4" />
                  (704) 221-8928
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: NAVY_DEEP }} className="text-white/70">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-md text-base font-extrabold text-white"
                  style={{
                    fontFamily: displayStack,
                    background: `linear-gradient(150deg, ${BLUE} 0%, ${NAVY} 100%)`,
                  }}
                >
                  P1
                </span>
                <span
                  className="text-sm font-extrabold uppercase tracking-wide text-white"
                  style={{ fontFamily: displayStack }}
                >
                  Land &amp; Property
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed">
                Heavy-equipment land &amp; property contractors for large acreage
                across the Carolinas.
              </p>
            </div>

            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: TAN }}
              >
                Services
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {services.slice(0, 5).map((s) => (
                  <li key={s.title}>
                    <a href="#" className="transition-colors hover:text-white">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: TAN }}
              >
                Service Area
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>Upstate South Carolina</li>
                <li>Greenville · Spartanburg · Anderson</li>
                <li>Charlotte, NC Metro</li>
                <li>Concord · Mooresville · Gastonia</li>
              </ul>
            </div>

            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: TAN }}
              >
                Get in Touch
              </h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a
                    href="tel:7042218928"
                    className="flex items-center gap-2.5 transition-colors hover:text-white"
                  >
                    <Phone className="h-4 w-4" style={{ color: BLUE }} />
                    (704) 221-8928
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@p1landmanagement.com"
                    className="flex items-center gap-2.5 transition-colors hover:text-white"
                  >
                    <Mail className="h-4 w-4" style={{ color: BLUE }} />
                    info@p1landmanagement.com
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BLUE }} />
                  Serving Upstate SC &amp; Charlotte NC
                </li>
              </ul>
              <Button
                className="mt-5 h-10 w-full rounded-md border-0 text-white sm:w-auto"
                style={{ background: BLUE }}
              >
                Get a Free Quote
              </Button>
            </div>
          </div>

          <div
            className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row"
            style={{ borderColor: "hsla(0,0%,100%,0.1)" }}
          >
            <span>© {new Date().getFullYear()} P1 Land &amp; Property Management. Licensed &amp; Insured.</span>
            <span>P1LandManagement.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Topographic;
