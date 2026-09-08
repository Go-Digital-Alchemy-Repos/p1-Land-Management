import { Link } from "wouter";
import logo from "@assets/Asset_1_1782329698014.svg";
import { Button } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-16 border-t border-border">
      <div className="site-shell grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-6">
        {/* Brand + contact */}
        <div className="col-span-2 space-y-6">
          <Link href="/">
            <img src={logo} alt="P1 Land & Property Management" className="h-12 w-auto brightness-0 invert" />
          </Link>
          <p className="text-secondary-foreground/70 text-sm leading-relaxed max-w-xs">
            Full-service land and property management for commercial, agricultural, and large residential properties 1 acre and larger across Upstate SC and the Charlotte, NC region.
          </p>
          <div className="space-y-2 pt-2">
            <a href="tel:7042218928" className="flex items-center gap-2 text-xl font-sans font-bold hover:text-primary transition-colors">
              <Phone className="h-5 w-5 text-primary" />
              (704) 221-8928
            </a>
            <a href="mailto:info@p1landmanagement.com" className="flex items-center gap-2 text-sm text-secondary-foreground/70 hover:text-primary transition-colors">
              <Mail className="h-4 w-4 text-primary" />
              info@p1landmanagement.com
            </a>
          </div>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-tan mb-6">Services</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li><Link href="/services/commercial-landscaping" className="hover:text-primary transition-colors">Commercial Landscaping</Link></li>
            <li><Link href="/services/industrial-agricultural" className="hover:text-primary transition-colors">Industrial & Agricultural</Link></li>
            <li><Link href="/services/land-clearing" className="hover:text-primary transition-colors">Land Clearing</Link></li>
            <li><Link href="/services/grading-site-preparation" className="hover:text-primary transition-colors">Grading & Site Prep</Link></li>
            <li><Link href="/services/drainage" className="hover:text-primary transition-colors">Drainage Solutions</Link></li>
            <li><Link href="/services/turf-installation-seeding" className="hover:text-primary transition-colors">Turf & Seeding</Link></li>
            <li><Link href="/services/tree-services" className="hover:text-primary transition-colors">Tree Services</Link></li>
            <li><Link href="/services/pond-waterway-management" className="hover:text-primary transition-colors">Pond & Waterway</Link></li>
            <li><Link href="/services/property-reconstruction" className="hover:text-primary transition-colors">Property Reconstruction</Link></li>
            <li><Link href="/services" className="font-semibold text-secondary-foreground/90 hover:text-primary transition-colors">All Services →</Link></li>
          </ul>
        </div>

        {/* Service Areas */}
        <div>
          <h4 className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-tan mb-6">Service Areas</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li className="font-bold text-secondary-foreground/90">Upstate South Carolina</li>
            <li><Link href="/service-areas/greenville-sc" className="hover:text-primary transition-colors">Greenville</Link></li>
            <li><Link href="/service-areas/spartanburg-sc" className="hover:text-primary transition-colors">Spartanburg</Link></li>
            <li><Link href="/service-areas/anderson-sc" className="hover:text-primary transition-colors">Anderson</Link></li>
            <li><Link href="/service-areas/lancaster-county-sc" className="hover:text-primary transition-colors">Lancaster County</Link></li>
            <li><Link href="/service-areas/york-county-sc" className="hover:text-primary transition-colors">York County</Link></li>
            <li className="font-bold text-secondary-foreground/90 pt-3">Greater Charlotte NC</li>
            <li><Link href="/service-areas/charlotte-nc" className="hover:text-primary transition-colors">Charlotte</Link></li>
            <li><Link href="/service-areas/concord-nc" className="hover:text-primary transition-colors">Concord</Link></li>
            <li><Link href="/service-areas/mooresville-lake-norman-nc" className="hover:text-primary transition-colors">Mooresville & Lake Norman</Link></li>
            <li><Link href="/service-areas/gastonia-nc" className="hover:text-primary transition-colors">Gastonia</Link></li>
            <li><Link href="/service-areas/union-county-nc" className="hover:text-primary transition-colors">Union County</Link></li>
            <li><Link href="/service-areas" className="font-semibold text-secondary-foreground/90 hover:text-primary transition-colors">All Areas →</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-tan mb-6">Company</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/gallery" className="hover:text-primary transition-colors">Service Gallery</Link></li>
            <li><Link href="/blog" className="hover:text-primary transition-colors">Blog & Resources</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact / Free Estimate</Link></li>
          </ul>
        </div>

        {/* Hours */}
        <div>
          <h4 className="font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-tan mb-6">Hours</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li>Mon – Fri: 7 AM – 6 PM</li>
            <li>Saturday: By Appointment</li>
            <li>Sunday: Closed</li>
            <li className="pt-4">
              <Button asChild variant="outline" className="w-full bg-transparent border-secondary-foreground/20 hover:bg-secondary-foreground/10 text-white">
                <Link href="/contact">Free Estimate</Link>
              </Button>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-shell mt-16 border-t border-secondary-foreground/10 pt-8 text-center text-sm text-secondary-foreground/50">
        © {new Date().getFullYear()} P1 Land & Property Management. Serving Upstate South Carolina & the Charlotte, NC region. All rights reserved.
      </div>
    </footer>
  );
}
