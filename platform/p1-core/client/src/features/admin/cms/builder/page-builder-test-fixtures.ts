import type { BuilderContent } from "./block-registry";

export const mixedBuilderFixture: BuilderContent = {
  blocks: [
    {
      id: "hero-block",
      type: "hero",
      props: {
        heading: "Support Your Community",
        subheading: "<p>Helping families find the right care and community.</p>",
        layout: "stacked",
      },
    },
    {
      id: "cta-legacy-block",
      type: "call-to-action",
      props: {
        heading: "Join the Network",
        body: "<p>Apply to be part of the verified provider network.</p>",
        ctaText: "Apply Now",
      },
    },
    {
      id: "blog-legacy-block",
      type: "blog-feed",
      props: {
        heading: "Latest Insights",
        limit: 5,
      },
    },
    {
      id: "events-block",
      type: "events-preview",
      props: {
        heading: "Upcoming Trainings",
        limit: 4,
      },
    },
    {
      id: "faq-block",
      type: "faq",
      props: {
        heading: "Common Questions",
        items: [{ question: "How do I apply?", answer: "<p>Use the application form.</p>" }],
      },
    },
    {
      id: "directory-block",
      type: "directory-browser",
      props: {
        heading: "Find a Verified Provider",
      },
    },
  ],
};

export const fixtureWithBrokenPreview: BuilderContent = {
  blocks: [
    ...mixedBuilderFixture.blocks,
    {
      id: "broken-preview-block",
      type: "blog-preview",
      props: {
        heading: "Featured Articles",
      },
    },
  ],
};
