import { Link } from "wouter";
import logo from "@assets/p1-logo-transparent.png";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-16 border-t border-border">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <Link href="/">
            <img src={logo} alt="P1 Land & Property Management" className="h-12 w-auto brightness-0 invert" />
          </Link>
          <p className="text-secondary-foreground/70 text-sm leading-relaxed max-w-xs">
            Full-service land and property management for commercial, agricultural, and large residential properties 1 acre and larger.
          </p>
          <div className="pt-2">
            <a href="tel:7042218928" className="text-2xl font-serif font-bold hover:text-primary transition-colors">
              (704) 221-8928
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg mb-6">Services</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li><Link href="/services/commercial-property-management" className="hover:text-primary transition-colors">Commercial Management</Link></li>
            <li><Link href="/services/land-clearing" className="hover:text-primary transition-colors">Land Clearing</Link></li>
            <li><Link href="/services/grading-site-preparation" className="hover:text-primary transition-colors">Grading & Site Prep</Link></li>
            <li><Link href="/services/drainage" className="hover:text-primary transition-colors">Drainage Solutions</Link></li>
            <li><Link href="/services/turf-installation-seeding" className="hover:text-primary transition-colors">Turf & Seeding</Link></li>
            <li><Link href="/services/property-reconstruction" className="hover:text-primary transition-colors">Property Reconstruction</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg mb-6">Service Areas</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li className="font-bold text-secondary-foreground/90">Upstate South Carolina</li>
            <li><Link href="/service-areas/greenville-sc" className="hover:text-primary transition-colors">Greenville</Link></li>
            <li><Link href="/service-areas/spartanburg-sc" className="hover:text-primary transition-colors">Spartanburg</Link></li>
            <li className="font-bold text-secondary-foreground/90 pt-3">Greater Charlotte NC</li>
            <li><Link href="/service-areas/charlotte-nc" className="hover:text-primary transition-colors">Charlotte</Link></li>
            <li><Link href="/service-areas/concord-nc" className="hover:text-primary transition-colors">Concord</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg mb-6">Hours & Info</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li>Monday – Friday: 7:00 AM – 6:00 PM</li>
            <li>Saturday: By Appointment</li>
            <li>Sunday: Closed</li>
            <li className="pt-4">
              <Button asChild variant="outline" className="w-full bg-transparent border-secondary-foreground/20 hover:bg-secondary-foreground/10 text-white">
                <Link href="/contact">Request Assessment</Link>
              </Button>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="container mx-auto px-4 mt-16 pt-8 border-t border-secondary-foreground/10 text-sm text-secondary-foreground/50 text-center">
        © {new Date().getFullYear()} P1 Land & Property Management. All rights reserved.
      </div>
    </footer>
  );
}
