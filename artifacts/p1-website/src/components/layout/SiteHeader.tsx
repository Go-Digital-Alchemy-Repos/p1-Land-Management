import { useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Phone, ChevronDown } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import logo from "@assets/Asset_1_1782329698014.svg";

export function SiteHeader({ assessmentCta = false }: { assessmentCta?: boolean }) {
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
    { name: "Commercial Property Management", href: "/services/commercial-property-management" },
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
          <img src={logo} alt="P1 Land & Property Management" className="h-10 md:h-12 w-auto" />
        </Link>
        
        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-6 font-medium text-sm text-foreground/80">
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
                <DropdownMenuItem key={s.href} asChild>
                  <Link href={s.href} className="cursor-pointer">{s.name}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild className="font-bold text-primary mt-2 border-t border-[#ededed]">
                <Link href="/service-areas" className="cursor-pointer">Service Areas</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/contact" className="group relative hover:text-primary transition-colors">
            Contact
            <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 bg-clay transition-all duration-300 group-hover:w-full" />
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <a href="tel:7042218928" className="hidden lg:flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
            (704) 221-8928
          </a>
          <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 hidden sm:inline-flex">
            {assessmentCta ? <a href="#assessment-request" onClick={(event) => { event.preventDefault(); focusAssessment(); }}>Request a Site Assessment</a> : <Link href="/contact">Get a Free Estimate</Link>}
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="text-secondary">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent onCloseAutoFocus={(event) => {
              if (!focusAssessmentAfterClose.current) return;
              event.preventDefault();
              focusAssessmentAfterClose.current = false;
              requestAnimationFrame(focusAssessment);
            }} aria-describedby={undefined} side="right" className="w-[300px] sm:w-[400px] overflow-y-auto bg-background">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-6 py-6">
                <Link href="/" onClick={() => setIsOpen(false)}>
                  <img src={logo} alt="P1 Land & Property Management" className="h-8 w-auto mb-4" />
                </Link>
                <div className="flex flex-col gap-4">
                  <Link href="/" onClick={() => setIsOpen(false)} className="text-lg font-medium text-secondary">Home</Link>
                  <Link href="/about" onClick={() => setIsOpen(false)} className="text-lg font-medium text-secondary">About</Link>

                  <div className="space-y-3">
                    <Link href="/services" onClick={() => setIsOpen(false)} className="text-lg font-medium text-secondary">Services</Link>
                    <div className="pl-4 flex flex-col gap-3 border-l border-border ml-2">
                      {services.map((s) => (
                        <Link key={s.href} href={s.href} onClick={() => setIsOpen(false)} className="text-secondary/70">
                          {s.name}
                        </Link>
                      ))}
                      <Link href="/service-areas" onClick={() => setIsOpen(false)} className="font-bold text-primary mt-2 border-t border-[#ededed] pt-3">
                        Service Areas
                      </Link>
                    </div>
                  </div>

                  <Link href="/contact" onClick={() => setIsOpen(false)} className="text-lg font-medium text-secondary">Contact</Link>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
                  <a href="tel:7042218928" className="flex items-center gap-2 text-lg font-bold text-secondary">
                    <Phone className="h-5 w-5 text-primary" />
                    (704) 221-8928
                  </a>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                    {assessmentCta ? <a href="#assessment-request" onClick={(event) => { event.preventDefault(); focusAssessmentAfterClose.current = true; setIsOpen(false); }}>Request a Site Assessment</a> : <Link href="/contact" onClick={() => setIsOpen(false)}>Get a Free Estimate</Link>}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
