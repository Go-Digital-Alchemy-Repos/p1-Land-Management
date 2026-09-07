import { PageLayout } from "@/components/layout/page-layout";

interface LegalFallbackPageProps {
  title: string;
  subtitle: string;
}

export default function LegalFallbackPage({ title, subtitle }: LegalFallbackPageProps) {
  return (
    <PageLayout>
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Legal
          </p>
          <h1 className="text-4xl font-heading font-semibold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl border bg-background p-6 sm:p-8">
            <p className="text-sm leading-7 text-muted-foreground">
              This page is intended to be managed through the CMS. If you are seeing this fallback
              version, the CMS page has not loaded yet. Once the CMS page is available, you can edit
              the full legal copy there without any further code changes.
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
