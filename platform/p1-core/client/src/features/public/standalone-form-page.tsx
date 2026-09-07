import { useBranding } from "@/components/shared/branding-provider";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { useParams } from "wouter";

export default function StandaloneFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const { frontendLogoUrl, companyName } = useBranding();

  if (!slug) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex justify-center">
          {frontendLogoUrl ? (
            <img
              src={frontendLogoUrl}
              alt={companyName || "Company logo"}
              className="max-h-20 w-auto object-contain"
            />
          ) : (
            <div className="text-center">
              <p className="font-heading text-2xl font-semibold text-foreground">
                {companyName || "Form"}
              </p>
            </div>
          )}
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm md:p-8">
          <PublicFormRenderer slug={slug} compact />
        </section>
      </div>
    </main>
  );
}
