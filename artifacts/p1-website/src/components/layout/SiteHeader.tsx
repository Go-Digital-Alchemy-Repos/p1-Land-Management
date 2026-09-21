import { useCms } from "@/lib/cms";
import { PublishedMenu, type MenuFormRequest } from "../menus/PublishedMenu";
const MenuFormDialog = lazy(() => import("../menus/MenuFormDialog"));
import { createElement, lazy, Suspense, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowUpRight, ChevronDown, ChevronRight, Home, Mail, Menu, Phone, TreePine, UserRound } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useSiteIdentity } from "@/lib/use-site-identity";

export function SiteHeader({ assessmentCta = false }: { assessmentCta?: boolean }) {
  const identity = useSiteIdentity();
  const assignedMenu = useCms().snapshot.menus?.locations.main_navigation;
  const [formRequest, setFormRequest] = useState<MenuFormRequest | null>(null);
  const pendingMobileForm = useRef<MenuFormRequest | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const focusAssessmentAfterClose = useRef(false);
  const focusAssessment = () => {
    const target = document.getElementById("assessment-request");
    if (!target) return;
    window.location.hash = "assessment-request";
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
  };

  const services = [
    { name: "Commercial Site Management", href: "/commercial" },
    { name: "Commercial Landscaping", href: "/services/commercial-landscaping" },
    { name: "Commercial Snow & Ice", href: "/services/commercial-snow-ice-management" },
    { name: "Industrial & Agricultural Land", href: "/services/industrial-agricultural" },
    { name: "Land Clearing", href: "/services/land-clearing" },
    { name: "Grading & Site Preparation", href: "/services/grading-site-preparation" },
    { name: "Drainage Solutions", href: "/services/drainage" },
    { name: "Turf Installation & Seeding", href: "/services/turf-installation-seeding" },
    { name: "Tree Services", href: "/services/tree-services" },
    { name: "Pond & Waterway Management", href: "/services/pond-waterway-management" },
    { name: "Property Reconstruction", href: "/services/property-reconstruction" },
  ];


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 shadow-md shadow-black/5 bg-background">
      <div className="site-shell flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          {createElement("img", { src: identity.logoUrl, alt: identity.companyName, className: "h-10 md:h-12 w-auto" })}
        </Link>
        
        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-6 font-medium text-sm text-foreground/80">
          {assignedMenu ? <PublishedMenu items={assignedMenu.items} variant="desktop" onForm={setFormRequest} /> : <>
          <Link href="/" className="group relative hover:text-primary transition-colors">
            Home
            <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 bg-clay transition-all duration-300 group-hover:w-full" />
          </Link>
          <Link href="/about" className="group relative hover:text-primary transition-colors">
            About
            <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 bg-clay transition-all duration-300 group-hover:w-full" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="group relative flex items-center gap-1 hover:text-primary transition-colors outline-none">
              Services <ChevronDown className="h-4 w-4" />
              <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 bg-clay transition-all duration-300 group-hover:w-full" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              {services.map((s) => (
                <DropdownMenuItem key={s.href} asChild className="focus:bg-primary/5 focus:text-foreground focus-visible:outline-none">
                  <Link href={s.href} className="cursor-pointer hover:bg-primary/5 focus:bg-primary/5 focus:outline-none focus-visible:outline-none">
                    {s.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild className="font-bold text-primary mt-2 border-t border-[#ededed] focus:bg-primary/5 focus:text-primary focus-visible:outline-none">
                <Link href="/service-areas" className="cursor-pointer hover:bg-primary/5 focus:bg-primary/5 focus:outline-none focus-visible:outline-none">
                  Service Areas
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/contact" className="group relative hover:text-primary transition-colors">
            Contact
            <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 bg-clay transition-all duration-300 group-hover:w-full" />
          </Link>
          </>}
        </nav>

        <div className="flex items-center gap-4">
          {createElement("a", { href: identity.phoneHref, className: "hidden lg:flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors" }, createElement(Phone, { className: "h-4 w-4" }), identity.phoneDisplay)}
          <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 hidden sm:inline-flex">
            {assessmentCta ? <a href="#assessment-request" onClick={(event) => { event.preventDefault(); focusAssessment(); }}>Get a Free Site Assessment</a> : <Link href="/contact">Get a Free Site Assessment</Link>}
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button data-p1-menu-trigger variant="ghost" size="icon" className="h-12 w-12 rounded-2xl border-2 border-primary/85 bg-background text-secondary shadow-sm transition-all duration-200 hover:bg-primary/5 hover:text-primary active:scale-95">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent onCloseAutoFocus={(event) => {
              if (pendingMobileForm.current) {
                event.preventDefault();
                const request = pendingMobileForm.current;
                pendingMobileForm.current = null;
                requestAnimationFrame(() => setFormRequest(request));
                return;
              }
              if (!focusAssessmentAfterClose.current) return;
              event.preventDefault();
              focusAssessmentAfterClose.current = false;
              requestAnimationFrame(focusAssessment);
            }} aria-describedby={undefined} side="right" overlayClassName="bg-secondary/45 backdrop-blur-[2px] data-[state=open]:duration-300 data-[state=closed]:duration-200" className="w-[min(94vw,26rem)] border-l border-border/70 bg-background/95 p-0 shadow-[-18px_0_50px_hsl(var(--secondary)/0.18)] backdrop-blur-xl sm:w-[400px] [&>button]:right-5 [&>button]:top-[max(1.125rem,env(safe-area-inset-top))] [&>button]:z-10 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-2xl [&>button]:border [&>button]:border-border [&>button]:bg-background/90 [&>button]:p-0 [&>button]:opacity-100 [&>button]:shadow-sm [&>button]:hover:bg-muted">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border/70 px-6 pb-5 pr-20 pt-[max(1.25rem,env(safe-area-inset-top))]">
                  <Link href="/" onClick={() => setIsOpen(false)} className="inline-flex transition-opacity hover:opacity-80">
                    {createElement("img", { src: identity.logoUrl, alt: identity.companyName, className: "h-9 w-auto" })}
                  </Link>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">P1 navigation</p>
                  <p className="mt-1 text-sm text-muted-foreground">Land and property care, made simple.</p>
                </div>
                <nav aria-label="Mobile navigation" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  {assignedMenu ? <PublishedMenu items={assignedMenu.items} variant="mobile" onNavigate={() => setIsOpen(false)} onForm={request => {pendingMobileForm.current = request; setIsOpen(false);}} /> : <>
                    <p className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Explore</p>
                    <div className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                      <Link href="/" onClick={() => setIsOpen(false)} className="flex min-h-14 items-center gap-3 px-4 text-secondary transition-colors hover:bg-muted/70 active:bg-muted"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Home className="h-4 w-4" /></span><span className="flex-1 font-semibold">Home</span><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></Link>
                      <Link href="/about" onClick={() => setIsOpen(false)} className="flex min-h-14 items-center gap-3 border-t border-border/70 px-4 text-secondary transition-colors hover:bg-muted/70 active:bg-muted"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay/10 text-clay-ink"><UserRound className="h-4 w-4" /></span><span className="flex-1 font-semibold">About P1</span><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></Link>
                      <Link href="/contact" onClick={() => setIsOpen(false)} className="flex min-h-14 items-center gap-3 border-t border-border/70 px-4 text-secondary transition-colors hover:bg-muted/70 active:bg-muted"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-supporting/10 text-supporting"><Mail className="h-4 w-4" /></span><span className="flex-1 font-semibold">Contact</span><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></Link>
                    </div>
                    <p className="mt-7 px-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Services</p>
                    <Accordion type="single" collapsible className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"><AccordionItem value="services" className="border-0"><AccordionTrigger className="min-h-16 px-4 py-3 text-secondary hover:bg-muted/70 hover:no-underline"><span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><TreePine className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Property services</span><span className="block truncate text-xs text-muted-foreground">Land, landscape, drainage & more</span></span></span></AccordionTrigger><AccordionContent className="border-t border-border/70 bg-muted/30 pb-2 pt-2"><div className="px-3"><Link href="/services" onClick={() => setIsOpen(false)} className="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-bold text-primary transition-colors hover:bg-background active:bg-background"><span>Browse all services</span><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>{services.map((s) => (<Link key={s.href} href={s.href} onClick={() => setIsOpen(false)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary/80 transition-colors hover:bg-background hover:text-primary active:bg-background"><span>{s.name}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /></Link>))}<Link href="/service-areas" className="font-bold text-primary mt-2 flex min-h-11 items-center justify-between rounded-xl border-t border-border/70 px-3 pt-3 transition-colors hover:bg-background" onClick={() => setIsOpen(false)}><span>Service Areas</span><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div></AccordionContent></AccordionItem></Accordion>
                  </>}
                </nav>
                <div className="border-t border-border/70 bg-background/90 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
                  <a href={identity.phoneHref} aria-label={`Call P1 at ${identity.phoneDisplay}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 font-bold text-secondary shadow-sm transition-all hover:border-primary/40 hover:text-primary active:scale-[0.98]">
                    <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                    Call P1 <span className="text-sm font-medium text-muted-foreground">{identity.phoneDisplay}</span>
                  </a>
                  <Button asChild className="mt-3 min-h-12 w-full rounded-2xl bg-primary font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:bg-primary/90 active:scale-[0.98]">
                    {assessmentCta ? <a href="#assessment-request" onClick={(event) => { event.preventDefault(); focusAssessmentAfterClose.current = true; setIsOpen(false); }}>Get a Free Site Assessment</a> : <Link href="/contact" onClick={() => setIsOpen(false)}>Get a Free Site Assessment</Link>}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {formRequest && <Suspense fallback={<p role="status" className="sr-only">Loading form</p>}><MenuFormDialog request={formRequest} onClose={() => setFormRequest(null)} /></Suspense>}
    </header>
  );
}
