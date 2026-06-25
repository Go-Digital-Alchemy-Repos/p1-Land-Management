import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Home, Hammer, MapPin, Phone, ArrowRight } from "lucide-react";

const quickLinks = [
  {
    title: "Home",
    description: "Start fresh from the front page.",
    href: "/",
    icon: Home,
  },
  {
    title: "Our Services",
    description: "Land clearing, grading, drainage, and more.",
    href: "/services",
    icon: Hammer,
  },
  {
    title: "Service Areas",
    description: "Upstate SC and the Charlotte, NC region.",
    href: "/service-areas",
    icon: MapPin,
  },
  {
    title: "Contact Us",
    description: "Request a free, no-pressure estimate.",
    href: "/contact",
    icon: Phone,
  },
];

export default function NotFound() {
  return (
    <Layout>
      <SEO
        title="Page Not Found | P1 Land & Property Management"
        description="The page you're looking for couldn't be found. Explore P1 Land & Property Management's land clearing, grading, drainage, and property management services across Upstate SC and Charlotte NC."
        noindex
      />

      {/* PAGE HERO */}
      <section className="relative py-28 md:py-36 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/40 to-transparent" />
        </div>
        <div className="container relative z-10 mx-auto max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <p className="text-7xl md:text-9xl font-serif font-extrabold tracking-tight text-primary">
            404
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-extrabold tracking-tight text-white">
            Looks Like This Ground Hasn't Been Cleared Yet
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed font-medium">
            The page you're looking for couldn't be found — it may have been
            moved or never existed. But your property still needs work, and
            we're here to help you find your way.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="text-base px-8 h-14 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <Link href="/">Back to Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8 h-14 w-full sm:w-auto border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white font-bold"
            >
              <a href="tel:7042218928">
                <Phone className="h-4 w-4" />
                Call (704) 221-8928
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="py-20 md:py-24 px-4 bg-background">
        <div className="container mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary">
              Where Would You Like to Go?
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              Pick up where you left off with one of these popular destinations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-1.5 text-xl font-serif font-bold text-secondary">
                      {link.title}
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary" />
                    </h3>
                    <p className="text-secondary/70 leading-relaxed">
                      {link.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
