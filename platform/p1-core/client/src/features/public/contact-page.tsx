import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { CompanyInformationCard } from "@/components/shared/company-information-card";

export default function ContactPage() {
  return (
    <PageLayout>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-contact-hero">
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center">
          <h1
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            data-testid="text-contact-heading"
          >
            Contact Us
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section
        className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
        data-testid="section-contact-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PublicFormRenderer slug="contact-form" showHeader={false} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <CompanyInformationCard
              titleClassName="public-heading-3"
              bodyClassName="public-helper-text"
              linkClassName="public-text-link hover:text-[hsl(var(--public-text-link-hover))]"
            />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
