import { createBlock, type BlockInstance } from "./block-registry";

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "starter" | "marketing" | "content";
  blockCount: number;
  blocks: () => BlockInstance[];
}

function block(type: string, overrides?: Record<string, unknown>): BlockInstance {
  const b = createBlock(type);
  if (overrides) {
    b.props = { ...b.props, ...overrides };
  }
  return b;
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "blank",
    name: "Blank Page",
    description: "Start from scratch with an empty canvas",
    icon: "FileText",
    category: "starter",
    blockCount: 0,
    blocks: () => [],
  },
  {
    id: "landing-v1",
    name: "Landing Page v1",
    description: "High-conversion landing page with hero, social proof, features, and CTA",
    icon: "Sparkles",
    category: "marketing",
    blockCount: 8,
    blocks: () => [
      block("hero", {
        heading: "Find a Verified Provider",
        subheading:
          "Connect with verified providers who match your needs, location, language, and service preferences.",
        ctaText: "Browse Providers",
        ctaLink: "/directory",
        ctaSecondaryText: "Learn More",
        ctaSecondaryLink: "#how-it-works",
        minHeight: "560",
      }),
      block("trust-bar"),
      block("social-proof-stats", {
        stats: [
          { value: "500+", label: "Verified Providers" },
          { value: "40+", label: "Countries Represented" },
          { value: "10,000+", label: "Members Connected" },
          { value: "4.9/5", label: "Average Rating" },
        ],
      }),
      block("section-header", {
        eyebrow: "How It Works",
        title: "Your Path to Support in 3 Simple Steps",
        subtitle: "Getting started with Core Platform is straightforward and stress-free.",
      }),
      block("delivery-setup", {
        title: "",
        steps: [
          {
            step: "1",
            title: "Browse the Directory",
            description:
              "Search by specialty, language, location, or service format to find your ideal match.",
          },
          {
            step: "2",
            title: "Review Profiles",
            description:
              "Read about their qualifications, approach, and lived cross-cultural experience.",
          },
          {
            step: "3",
            title: "Connect & Begin",
            description: "Reach out directly through their profile to schedule your first session.",
          },
        ],
      }),
      block("feature-list", {
        title: "Why Core Platform?",
        subtitle:
          "We built this platform for configurable communities, directories, and member experiences.",
        columns: "3",
        features: [
          {
            icon: "Globe",
            title: "Context-Aware Support",
            description:
              "Directory settings help each site describe the provider expertise that matters.",
          },
          {
            icon: "ShieldCheck",
            title: "Vetted Professionals",
            description: "Thorough verification ensures quality and safety for every member.",
          },
          {
            icon: "Heart",
            title: "Platform-Approved Providers",
            description:
              "Provider requirements can reflect the trust standards for each site install.",
          },
        ],
      }),
      block("testimonials", {
        title: "What Our Community Says",
        items: [
          {
            quote:
              "Finding the right provider through one focused directory made the next step feel simple.",
            name: "Sarah M.",
            role: "Community Member",
            location: "Singapore",
          },
          {
            quote: "I finally feel seen and understood in a way I never did before.",
            name: "James T.",
            role: "Core Platform Client",
            location: "Germany",
          },
          {
            quote: "The platform made it so easy to find the right fit for my needs.",
            name: "Priya K.",
            role: "Expat Parent",
            location: "UAE",
          },
        ],
      }),
      block("cta", {
        heading: "Ready to Find Your Match?",
        subheading: "Browse a verified provider network and take the first step today.",
        primaryText: "Browse Providers",
        primaryLink: "/directory",
        secondaryText: "Join as a Provider",
        secondaryLink: "/join",
        variant: "dark",
      }),
    ],
  },
  {
    id: "content-story-v1",
    name: "Content Story v1",
    description: "Long-form storytelling page with rich text, images, and supporting sections",
    icon: "BookOpen",
    category: "content",
    blockCount: 6,
    blocks: () => [
      block("section-header", {
        eyebrow: "Our Story",
        title: "The Core Platform Mission",
        subtitle:
          "How we're helping teams launch trusted digital experiences for their communities.",
        alignment: "center",
      }),
      block("text-image", {
        heading: "A Community Built on Understanding",
        body: "Core Platform was built from a simple realization: teams need a flexible foundation for directories, content, events, commerce, memberships, and community workflows without rebuilding the same plumbing every time.",
        imageAlt: "Core Platform community",
        imagePosition: "right",
      }),
      block("rich-text", {
        content:
          "<h2>Why Configurable Platforms Matter</h2><p>Organizations need digital experiences that reflect their language, trust model, and operating workflows.</p><p>Core Platform bridges this gap with installable apps, CMS-driven content, provider directories, ecommerce, events, and member experiences.</p>",
        alignment: "left",
      }),
      block("text-image", {
        heading: "Our Impact So Far",
        body: "Core Platform helps teams connect audiences with resources, listings, products, events, and services through one configurable website platform.",
        imageAlt: "Global impact",
        imagePosition: "left",
      }),
      block("benefit-stack", {
        title: "What Sets Us Apart",
        layout: "timeline",
        items: [
          {
            icon: "Globe",
            title: "Global Network",
            description:
              "Providers and resources can be organized across regions, languages, and audiences.",
          },
          {
            icon: "ShieldCheck",
            title: "Rigorous Vetting",
            description:
              "Every professional undergoes thorough verification and background checks.",
          },
          {
            icon: "Heart",
            title: "Cultural Sensitivity",
            description:
              "Each site can define the trust criteria and approval process that fits its community.",
          },
          {
            icon: "Users",
            title: "Community Focus",
            description:
              "Built for teams that need practical, member-friendly digital infrastructure.",
          },
        ],
      }),
      block("cta", {
        heading: "Join Our Mission",
        subheading:
          "Whether you're seeking support or want to help others, there's a place for you here.",
        primaryText: "Browse Providers",
        primaryLink: "/directory",
        secondaryText: "Join as a Provider",
        secondaryLink: "/join",
        variant: "accent",
      }),
    ],
  },
  {
    id: "conversion-funnel-v1",
    name: "Conversion Funnel v1",
    description: "Persuasion-focused page with objection handling, before/after, and strong CTAs",
    icon: "TrendingUp",
    category: "marketing",
    blockCount: 7,
    blocks: () => [
      block("hero", {
        heading: "Find the Right Provider Faster",
        subheading:
          "Use a focused directory to compare verified providers, service formats, and areas of expertise.",
        ctaText: "Find Your Provider",
        ctaLink: "/directory",
        ctaSecondaryText: "",
        ctaSecondaryLink: "",
        minHeight: "420",
        badge: "Verified Directory",
      }),
      block("recovery-use-cases", {
        title: "Is Core Platform Right for You?",
        subtitle: "Our platform serves a diverse range of cross-cultural individuals and families.",
        personas: [
          {
            title: "Community Members",
            description:
              "You want a clear way to find services, resources, or providers that fit your needs.",
            icon: "User",
          },
          {
            title: "Families",
            description:
              "You want practical resources, events, and trusted providers for your household.",
            icon: "Users",
          },
          {
            title: "Multi-Audience Groups",
            description:
              "You and your partner navigate different cultural backgrounds and need help bridging the gap.",
            icon: "Heart",
          },
        ],
      }),
      block("before-after", {
        title: "Your Transformation Journey",
        items: [
          {
            before: "Feeling isolated and misunderstood",
            after: "Connected with a provider who fits",
            milestone: "Week 1",
          },
          {
            before: "Struggling to compare options",
            after: "Using clear profile details to choose confidently",
            milestone: "Month 1",
          },
          {
            before: "Navigating decisions alone",
            after: "Finding resources and next steps in one place",
            milestone: "Month 3",
          },
        ],
      }),
      block("social-proof-stats", {
        stats: [
          { value: "500+", label: "Verified Providers" },
          { value: "40+", label: "Countries" },
          { value: "98%", label: "Satisfaction Rate" },
        ],
      }),
      block("objection-busters", {
        title: "Common Questions & Concerns",
        items: [
          {
            concern: "How do I know a provider is a fit?",
            response:
              "Profiles can show qualifications, specialties, service formats, and the approval criteria behind each listing.",
          },
          {
            concern: "Can services be delivered online?",
            response:
              "Listings can show whether services are virtual, in-person, or hybrid so members can choose what works.",
          },
          {
            concern: "What if I don't find the right fit?",
            response:
              "Our directory lets you filter by specialty, language, location, and approach. Plus, our support team can help you find the right match.",
          },
        ],
      }),
      block("guarantee-warranty", {
        title: "Our Commitment to You",
        items: [
          { text: "Every provider can be individually vetted and verified" },
          { text: "Your privacy and confidentiality are always protected" },
          { text: "Support team available to help you find the right match" },
          { text: "No hidden fees — browse the directory completely free" },
        ],
        ctaText: "Need Help? Contact Support",
        ctaLink: "/contact",
      }),
      block("cta", {
        heading: "Take the First Step Today",
        subheading: "Browse the directory, compare verified providers, and choose a next step.",
        primaryText: "Browse Providers Now",
        primaryLink: "/directory",
        secondaryText: "",
        secondaryLink: "",
        variant: "dark",
      }),
    ],
  },
  {
    id: "blog-page-v1",
    name: "Blog Page v1",
    description:
      "Blog listing page with an editable intro, featured post, and configurable post feed",
    icon: "Newspaper",
    category: "content",
    blockCount: 3,
    blocks: () => [
      block("section-header", {
        eyebrow: "Resource Library",
        title: "Insights & Articles",
        subtitle: "Explore articles, resources, and insights for your community.",
        alignment: "center",
      }),
      block("blog-featured-post", {
        layout: "split",
      }),
      block("blog-post-feed", {
        postsPerPage: 9,
        gridColumns: "3",
        feedStyle: "pagination",
        showSearch: true,
        showCategoryFilter: true,
        showTagFilter: true,
      }),
    ],
  },
];

export interface LandingPageGoal {
  id: string;
  label: string;
  description: string;
}

export const LANDING_PAGE_GOALS: LandingPageGoal[] = [
  {
    id: "find-provider",
    label: "Help users find a provider",
    description: "Drive visitors to browse and connect with providers",
  },
  {
    id: "join-network",
    label: "Recruit providers to join",
    description: "Convince qualified providers to join the network",
  },
  {
    id: "build-awareness",
    label: "Build awareness about Core Platform",
    description: "Educate visitors about the Core Platform experience and the platform",
  },
  {
    id: "promote-event",
    label: "Promote an event or webinar",
    description: "Drive registrations for upcoming community events",
  },
  {
    id: "general",
    label: "General purpose landing page",
    description: "Flexible landing page for any campaign or purpose",
  },
];

export interface AudienceOption {
  id: string;
  label: string;
}

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  { id: "members", label: "Community Members" },
  { id: "expat-families", label: "Families" },
  { id: "cross-cultural-couples", label: "Multi-Audience Groups" },
  { id: "organizations", label: "Organizations & Schools" },
  { id: "providers", label: "Verified Providers" },
  { id: "general", label: "General Audience" },
];

export interface WizardBlockOption {
  id: string;
  type: string;
  label: string;
  description: string;
  recommended: boolean;
}

export function getRecommendedBlocks(goalId: string): WizardBlockOption[] {
  const all: WizardBlockOption[] = [
    {
      id: "hero",
      type: "hero",
      label: "Hero Section",
      description: "Full-width hero with heading and CTA buttons",
      recommended: true,
    },
    {
      id: "trust-bar",
      type: "trust-bar",
      label: "Trust Bar",
      description: "Row of trust signals (verified, secure, etc.)",
      recommended: false,
    },
    {
      id: "stats",
      type: "social-proof-stats",
      label: "Statistics",
      description: "Key numbers and metrics",
      recommended: false,
    },
    {
      id: "features",
      type: "feature-list",
      label: "Features / Benefits",
      description: "Icon + text feature cards",
      recommended: false,
    },
    {
      id: "how-it-works",
      type: "delivery-setup",
      label: "How It Works",
      description: "Step-by-step process",
      recommended: false,
    },
    {
      id: "testimonials",
      type: "testimonials",
      label: "Testimonials",
      description: "Quotes from community members",
      recommended: false,
    },
    {
      id: "use-cases",
      type: "recovery-use-cases",
      label: "Who It's For",
      description: "Persona-based messaging",
      recommended: false,
    },
    {
      id: "before-after",
      type: "before-after",
      label: "Before & After",
      description: "Transformation journey milestones",
      recommended: false,
    },
    {
      id: "objections",
      type: "objection-busters",
      label: "Objection Busters",
      description: "Address common concerns",
      recommended: false,
    },
    {
      id: "faq",
      type: "faq",
      label: "FAQ",
      description: "Frequently asked questions",
      recommended: false,
    },
    {
      id: "guarantee",
      type: "guarantee-warranty",
      label: "Guarantee",
      description: "Trust-building commitments",
      recommended: false,
    },
    {
      id: "cta",
      type: "cta",
      label: "Call to Action",
      description: "Bold CTA section with buttons",
      recommended: true,
    },
    {
      id: "events",
      type: "events-preview",
      label: "Events Preview",
      description: "Upcoming events from the system",
      recommended: false,
    },
    {
      id: "providers",
      type: "featured-professionals",
      label: "Featured Providers",
      description: "Live provider cards from directory",
      recommended: false,
    },
  ];

  const goalRecommendations: Record<string, string[]> = {
    "find-provider": ["hero", "trust-bar", "stats", "how-it-works", "testimonials", "cta"],
    "join-network": ["hero", "stats", "features", "testimonials", "guarantee", "cta"],
    "build-awareness": ["hero", "features", "use-cases", "before-after", "faq", "cta"],
    "promote-event": ["hero", "stats", "features", "events", "testimonials", "cta"],
    general: ["hero", "features", "testimonials", "cta"],
  };

  const recommended = goalRecommendations[goalId] ?? goalRecommendations["general"];
  return all.map((b) => ({ ...b, recommended: recommended!.includes(b.id) }));
}

const AUDIENCE_LABELS: Record<string, string> = {
  members: "Community Members",
  "expat-families": "Families",
  "cross-cultural-couples": "Multi-Audience Groups",
  organizations: "Organizations & Schools",
  providers: "Verified Providers",
  general: "Everyone",
};

function buildAudienceSubheading(audiences: string[], fallback: string): string {
  if (!audiences.length) return fallback;
  const labels = audiences.map((a) => AUDIENCE_LABELS[a] ?? a);
  if (labels.length === 1) return `Designed specifically for ${labels[0]}.`;
  const last = labels.pop();
  return `Designed for ${labels.join(", ")} and ${last}.`;
}

function buildUseCasesForAudiences(audiences: string[]) {
  const personas: Record<string, { title: string; description: string; icon: string }> = {
    members: {
      title: "Community Members",
      description:
        "Adults who grew up across cultures and need support navigating identity, belonging, and transitions.",
      icon: "User",
    },
    "expat-families": {
      title: "Families",
      description: "Households looking for trusted services, events, and resources.",
      icon: "Users",
    },
    "cross-cultural-couples": {
      title: "Multi-Audience Groups",
      description:
        "Groups with different needs who need clear ways to find shared resources and services.",
      icon: "Heart",
    },
    organizations: {
      title: "Organizations & Schools",
      description:
        "Companies and schools supporting internationally mobile employees and students.",
      icon: "Building2",
    },
    providers: {
      title: "Verified Providers",
      description: "Qualified providers seeking to join a platform-approved network.",
      icon: "UserCheck",
    },
    general: {
      title: "The Global Community",
      description: "Anyone seeking trusted resources, services, and community support.",
      icon: "Globe",
    },
  };
  return audiences.map((a) => personas[a] ?? personas["general"]!);
}

export function generateLandingPageBlocks(
  goalId: string,
  headline: string,
  subheadline: string,
  audiences: string[],
  selectedBlockIds: string[],
  ctaText: string,
  ctaLink: string,
): BlockInstance[] {
  const blockOptions = getRecommendedBlocks(goalId);
  const blocks: BlockInstance[] = [];
  const audienceDesc = buildAudienceSubheading(audiences, "");

  for (const id of selectedBlockIds) {
    const opt = blockOptions.find((b) => b.id === id);
    if (!opt) continue;

    if (opt.type === "hero") {
      blocks.push(
        block("hero", {
          heading: headline || "Welcome to Core Platform",
          subheading:
            subheadline ||
            audienceDesc ||
            "Connecting members with verified providers, resources, and community tools.",
          ctaText: ctaText || "Get Started",
          ctaLink: ctaLink || "/directory",
          ctaSecondaryText: "",
          ctaSecondaryLink: "",
          minHeight: "560",
        }),
      );
    } else if (opt.type === "cta") {
      blocks.push(
        block("cta", {
          heading: "Ready to Get Started?",
          subheading:
            subheadline ||
            audienceDesc ||
            "Take the first step toward trusted support and practical resources.",
          primaryText: ctaText || "Get Started",
          primaryLink: ctaLink || "/directory",
          variant: "dark",
        }),
      );
    } else if (opt.type === "recovery-use-cases" && audiences.length > 0) {
      const useCasePersonas = buildUseCasesForAudiences(audiences);
      blocks.push(
        block("recovery-use-cases", {
          title: "Who Is This For?",
          subtitle: "",
          personas: useCasePersonas,
        }),
      );
    } else {
      blocks.push(block(opt.type));
    }
  }

  return blocks;
}
