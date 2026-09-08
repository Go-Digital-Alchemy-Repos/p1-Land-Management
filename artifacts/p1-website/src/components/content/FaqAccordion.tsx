export type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: readonly FaqItem[];
};

/**
 * Public FAQ presentation for accessibility, answer-engine retrieval, and performance.
 *
 * Pages pair this server-rendered question/answer markup with `faqSchema(items)` in their
 * `SEO` component, which emits the canonical Schema.org FAQPage JSON-LD. Native `details`
 * avoids a client-state dependency: answers remain in the initial HTML for crawlers and
 * assistive technology while visitors can reveal only the answer they need.
 */
export function FaqAccordion({ items }: FaqAccordionProps) {
  const context = useCms();

  return (
    <div className="space-y-4" data-content-type="faq" data-schema-type="FAQPage">
      {items.map((item) => {
        // This explicit CMS binding keeps FAQ copy previewable and editable even
        // though this reusable component is rendered outside the page module.
        const question = cmsValue(context, item.question);
        const answer = cmsValue(context, item.answer, item.answer.length > 120 ? "textarea" : "text");

        return (
          <details
            key={item.question}
            className="group rounded-xl border border-card-border bg-card shadow-sm"
            data-faq-item
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 p-6 text-left [&::-webkit-details-marker]:hidden">
              <h3 className="text-lg font-serif font-bold text-secondary">{question}</h3>
              <span
                aria-hidden="true"
                className="shrink-0 text-2xl font-light leading-none text-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <div className="border-t border-border px-6 pb-6 pt-4">
              <p className="leading-relaxed text-secondary/80">{answer}</p>
            </div>
          </details>
        );
      })}
    </div>
  );
}
import { cmsValue, useCms } from "@/lib/cms";
