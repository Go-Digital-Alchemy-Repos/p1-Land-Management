import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as SelectParts from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  isPublicFormPreview,
  usePublicFormVerification,
} from "@/components/forms/PublicFormVerification";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { FormPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation";
import { FormPresentationHostProvider } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation-host";
import type { CmsForm } from "../../../../platform/p1-core/shared/schema/forms";

const formPath = "/forms/:slug";
const slugPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

async function readJson(response: Response, maxBytes: number) {
  if (!response.headers.get("content-type")?.includes("application/json") || !response.body)
    throw Error("The form service is unavailable. Please try again.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw Error("The form response was too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

// Core and the public app have separate React type versions; Vite deduplicates their runtime.
const ui = {
  Button,
  Checkbox,
  Input,
  Label,
  Textarea,
  ...SelectParts,
} as unknown as NonNullable<ComponentProps<typeof FormPresentationHostProvider>["value"]>["ui"];

export default function PublicForm() {
  const [, params] = useRoute(formPath);
  const slug = params?.slug || "";
  const preview = isPublicFormPreview();
  const [form, setForm] = useState<CmsForm>();
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }>();
  const [accepted, setAccepted] = useState(false);
  const pendingSlugs = useRef(new Set<string>());
  const activeSlug = useRef(slug);
  const routeVersion = useRef(0);
  const verification = usePublicFormVerification(preview || accepted);
  const host = useMemo(
    () => ({
      ui,
      // Ignore a stale renderer's completion notice after route navigation.
      toast: (nextNotice: NonNullable<typeof notice>) => {
        if (activeSlug.current === slug) setNotice(nextNotice);
      },
    }),
    [slug],
  );

  useEffect(() => {
    const routeChanged = activeSlug.current !== slug;
    activeSlug.current = slug;
    routeVersion.current += 1;
    if (routeChanged) verification.reset();
    setNotice(undefined);
    if (!slugPattern.test(slug)) {
      setForm(undefined);
      setLoading(false);
      setError("This form is unavailable. Please request a site visit or call P1.");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let disposed = false;
    setForm(undefined);
    setLoading(true);
    setError("");
    setAccepted(false);
    void fetch(`/api/forms/${encodeURIComponent(slug)}`, {
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw Error("This form is currently unavailable.");
        const data = await readJson(response, 524288);
        if (
          !data ||
          data.slug !== slug ||
          !Array.isArray(data.fields) ||
          data.fields.length > 200
        )
          throw Error("This form could not be loaded.");
        return data as CmsForm;
      })
      .then((data) => {
        if (!disposed) setForm(data);
      })
      .catch(() => {
        if (!disposed)
          setError("This form could not be loaded. Please request a site visit or call P1.");
      })
      .finally(() => {
        clearTimeout(timer);
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  async function submit(values: Record<string, unknown>, idempotencyKey: string) {
    const submissionSlug = slug;
    const submissionVersion = routeVersion.current;
    if (preview || pendingSlugs.current.has(submissionSlug))
      throw Error("A submission is already in progress or this is a preview.");
    const verificationHeaders = verification.headers();
    pendingSlugs.current.add(submissionSlug);
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(submissionSlug)}/submit`, {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(25000),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          ...verificationHeaders,
        },
        body: JSON.stringify(values),
      });
      const result = await readJson(response, 16384);
      if (!response.ok || typeof result.submissionId !== "string")
        throw Error("We could not confirm receipt. Your entries are retained; please retry.");
      return {
        message:
          typeof result.message === "string"
            ? result.message
            : "Your inquiry has been received.",
      };
    } catch (cause) {
      if (
        activeSlug.current === submissionSlug &&
        routeVersion.current === submissionVersion
      )
        verification.reset();
      throw cause;
    } finally {
      pendingSlugs.current.delete(submissionSlug);
    }
  }

  const visibleForm = form?.slug === slug ? form : undefined;
  const visibleRouteVersion = routeVersion.current;

  return (
    <Layout>
      <SEO
        title="Complete Your Request | P1 Land Management"
        description="Complete a secure P1 Land & Property Management form."
        noindex
      />
      <PageHero
        eyebrow="P1 Land & Property Management"
        title="Complete your request"
        subtitle="Use this secure form to share the details P1 needs to follow up."
        compactMobile
      />
      <section className="bg-background py-10 md:py-16">
        <div className="site-shell max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-6 shadow-lg md:p-10">
            {error ? (
              <div role="alert" className="space-y-4">
                <p>{error}</p>
                <a className="font-bold text-primary underline" href="/contact">
                  Request a site visit
                </a>
              </div>
            ) : (
              <FormPresentationHostProvider value={host}>
                {!accepted && <>
                  {!preview && verification.control}
                  <FormPresentation
                    key={slug}
                    slug={slug}
                    form={visibleForm}
                    isLoading={loading}
                    preview={preview}
                    submit={submit}
                    onSubmitSuccess={() => {
                      if (
                        activeSlug.current === slug &&
                        routeVersion.current === visibleRouteVersion
                      )
                        setAccepted(true);
                    }}
                  />
                </>}
                {accepted && (
                  <div className="space-y-4" role="status">
                    <h2 className="text-2xl font-serif font-bold text-secondary">Thank you.</h2>
                    <p>P1 has received your inquiry and will follow up soon.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNotice(undefined);
                        setAccepted(false);
                      }}
                    >
                      Submit another request
                    </Button>
                  </div>
                )}
              </FormPresentationHostProvider>
            )}
            {notice && (
              <div role={notice.variant === "destructive" ? "alert" : "status"} className="mt-5 rounded border p-3">
                <strong>{notice.title}</strong>
                {notice.description && <p>{notice.description}</p>}
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Prefer to talk? <a className="font-bold text-primary underline" href={PHONE_HREF}>{PHONE_DISPLAY}</a>
          </p>
        </div>
      </section>
    </Layout>
  );
}
