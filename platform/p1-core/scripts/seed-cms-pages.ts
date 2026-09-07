import { db } from "../server/db";
import { cmsPages } from "../shared/schema/cms-pages";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

function uid() {
  return randomUUID();
}

const homeContent = {
  blocks: [
    {
      id: uid(),
      type: "hero",
      props: {
        heading: 'A modular website platform built to grow with you.',
        subheading: "",
        ctaText: "Browse the Directory",
        ctaLink: "/directory",
        ctaSecondaryText: "Open Admin",
        ctaSecondaryLink: "/auth/register",
        backgroundImageUrl: "/images/hero-therapy-session-1280w.webp",
        overlayOpacity: 85,
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        title: "Why Core Platform?",
        subtitle: "Build public pages, directories, events, storefronts, and member workflows on one configurable platform.",
        columns: "3",
        cards: [
          {
            icon: "Globe",
            title: "Modular Site Apps",
            description: "Enable directory, events, ecommerce, careers, portfolio, CRM, and content modules as each install needs them.",
          },
          {
            icon: "Heart",
            title: "Verified Workflows",
            description: "Review applications, manage listings, publish content, and keep operational settings consistent from one admin shell.",
          },
          {
            icon: "Users",
            title: "Public Experiences",
            description: "Give visitors fast pages, searchable listings, event registration, storefronts, and clear paths to action.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        title: "What Can Each Install Become?",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Each install can be shaped around the apps it needs. Start with content and a directory, add events or ecommerce when ready, and keep the admin workflow consistent as the site grows.</p>",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "testimonials",
      props: {
        title: "What People Are Saying",
        items: [
          {
            quote:
              "We launched a polished directory, events hub, and content site without stitching together separate tools.",
            name: "Sarah M.",
            role: "Operations Lead",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Core Platform gave our team one place to manage pages, listings, registrations, and member workflows.",
            name: "James K.",
            role: "Program Director",
            location: "Dubai",
            avatarUrl:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "As a listing owner, I can keep my profile current and respond to inquiries without depending on an admin.",
            name: "Amara O.",
            role: "Listing Owner",
            location: "Nairobi",
            avatarUrl:
              "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The admin experience is clear enough for daily updates and flexible enough for our future modules.",
            name: "Lena T.",
            role: "Site Editor",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The filters helped visitors compare providers quickly, and the map view made regional discovery much easier.",
            name: "Marcus W.",
            role: "Directory Visitor",
            location: "Virginia, USA",
            avatarUrl:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Finally, a site platform that feels built for real operations, not just a landing page.",
            name: "Priya D.",
            role: "Executive Sponsor",
            location: "London",
            avatarUrl:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "therapist-map",
      props: {
        title: "Our Listing Owners Around the World",
        subtitle: "Use map and list views to help visitors discover relevant listings quickly",
      },
    },
    {
      id: uid(),
      type: "events-preview",
      props: {
        title: "Upcoming Events",
        subtitle: "Publish events, registrations, reminders, and member-only programming from the same platform.",
        limit: 3,
      },
    },
    {
      id: uid(),
      type: "blog-preview",
      props: {
        title: "Featured Articles",
        subtitle: "Latest insights on platform operations, content workflows, admin UX, and launch readiness.",
        limit: 6,
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Ready to Build on Core Platform?",
        subheading:
          "Use one admin workspace to manage content, listings, events, storefronts, integrations, and the operational details that keep a modern site moving.",
        primaryText: "Join the Directory",
        primaryLink: "/auth/register",
        variant: "accent",
      },
    },
  ],
};

const aboutContent = {
  blocks: [
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "ABOUT CORE PLATFORM",
        title: "A Modular Platform for Modern Website Operations",
        subtitle: "Core Platform helps teams manage public content, directories, events, commerce, memberships, and operational workflows from one admin workspace.",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Core Platform was built for organizations that need more than a brochure site. It brings configurable public experiences and practical admin tools together so teams can launch, maintain, and grow complex sites without stitching together unrelated systems.</p>",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        columns: "3",
        cards: [
          {
            icon: "LayoutDashboard",
            title: "One Admin Workspace",
            description: "Manage content, listings, events, ecommerce, forms, settings, and integrations from a consistent operational shell.",
          },
          {
            icon: "Puzzle",
            title: "Installable Apps",
            description: "Enable only the modules each site needs, then expand cleanly as new programs or revenue streams come online.",
          },
          {
            icon: "ShieldCheck",
            title: "Launch Discipline",
            description: "Use permissions, feature gates, SEO tools, save-state protections, and preview flows to keep releases controlled.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "FAQ",
        title: "Common Questions",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "faq",
      props: {
        items: [
          {
            question: "What kinds of sites can Core Platform support?",
            answer: "Core Platform can support content sites, provider or vendor directories, event programs, ecommerce storefronts, portfolio sites, careers pages, memberships, and CRM-backed forms.",
          },
          {
            question: "Do all installs need every module?",
            answer: "No. Optional apps can be enabled or disabled so each install only exposes the routes, navigation, and API surfaces it needs.",
          },
          {
            question: "Can public branding differ by site?",
            answer: "Yes. CMS theme presets can style public content while the admin interface keeps stable operational design tokens.",
          },
          {
            question: "Who manages listings and applications?",
            answer: "Admins can review applications, approve listings, manage profile data, and configure the labels and fields that match their use case.",
          },
        ],
      },
    },
  ],
};
const contactContent = {
  blocks: [
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "GET IN TOUCH",
        title: "Contact Us",
        subtitle: "Have a question or feedback? We'd love to hear from you.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "contact-form",
      props: {},
    },
  ],
};

const joinContent = {
  blocks: [
    {
      id: uid(),
      type: "join-registration-form",
      props: {
        heading: "Apply to Join the Directory",
        accentHeading: "Get Started",
        subheading: "Submit your information for review and keep your listing details current after approval.",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        title: "What Happens Next?",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        columns: "3",
        cards: [
          {
            icon: "ClipboardCheck",
            title: "1. Submit Details",
            description: "Complete the application with your profile, qualifications, services, and contact preferences.",
          },
          {
            icon: "ShieldCheck",
            title: "2. Review",
            description: "Admins review the application, request follow-up if needed, and approve listings that meet the site's standards.",
          },
          {
            icon: "UserCheck",
            title: "3. Publish",
            description: "Approved listing owners can keep their profile current while visitors discover them through search, filters, and maps.",
          },
        ],
      },
    },
  ],
};
const insightsContent = {
  blocks: [
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "Core Platform Blog",
        title: "Insights & Articles",
        subtitle: "Explore articles, research, and insights for member communities.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "blog-featured-post",
      props: {
        title: "Featured Article",
        layout: "split",
      },
    },
    {
      id: uid(),
      type: "blog-post-feed",
      props: {
        title: "All Articles",
        postsPerPage: 9,
        gridColumns: "3",
        feedStyle: "pagination",
        showSearch: true,
        showCategoryFilter: true,
        showTagFilter: true,
      },
    },
  ],
};

const eventsContent = {
  blocks: [
    {
      id: uid(),
      type: "events-archive",
      props: {
        heading: "Upcoming Events",
        subheading:
          "We offer quarterly platform-approved trainings for professional providers. All of our customers get free registration to the events below.",
        defaultView: "list",
        showViewToggle: true,
      },
    },
  ],
};

const recordingsContent = {
  blocks: [
    {
      id: uid(),
      type: "video-archives",
      props: {
        heading: "Video Archives",
        subheading: "Browse our collection of past trainings and webinars.",
        showSearch: true,
        showYearFilter: true,
        showAccessFilter: true,
      },
    },
  ],
};

const portfolioContent = {
  blocks: [
    {
      id: uid(),
      type: "portfolio-grid",
      props: {
        eyebrow: "Featured Case Study",
        heading: "Featured Portfolio Project",
        subheading:
          "A closer look at selected work, project context, and measurable outcomes.",
        layout: "list",
        featuredOnly: true,
        excludeFeatured: false,
        showSearch: false,
        showIndustryFilter: false,
        showCategoryFilter: false,
        showLocationFilter: false,
        limit: 1,
      },
    },
    {
      id: uid(),
      type: "portfolio-grid",
      props: {
        eyebrow: "Portfolio",
        heading: "Explore More Work",
        subheading:
          "Browse additional seeded case studies across real estate, web development, creative portfolios, and service launches.",
        layout: "grid",
        featuredOnly: false,
        excludeFeatured: true,
        showSearch: true,
        showIndustryFilter: true,
        showCategoryFilter: true,
        showLocationFilter: true,
        limit: 0,
      },
    },
  ],
};

const directoryContent = {
  blocks: [
    {
      id: uid(),
      type: "directory-browser",
      props: {
        heading: "Find a Listing Owner",
        subheading:
          "Search for platform-approved care by specialty, location, language, or session format, then explore results on the map.",
        showCategoryChips: true,
        showMap: true,
      },
    },
    {
      id: uid(),
      type: "text-image",
      props: {
        heading: "Why Core Platform?",
        body:
          "Traditional support models were developed within a single cultural framework. When customers bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A listing owner understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.",
        imageUrl:
          "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=1200&fit=crop&crop=faces",
        imageAlt: "platform-approved support",
        imagePosition: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        title: 'What does it mean to be "vetted"?',
        subtitle: "And just as importantly, what it does not mean.",
        content:
          "<h3>What does it mean to be &ldquo;vetted&rdquo;?</h3><ul><li>Every listing owner completes a detailed application process</li><li>Credentials and licensure are verified</li><li>Relevant experience, qualifications, or service fit can be reviewed</li><li>Profiles are reviewed by our team before being published</li></ul><h3>What does it NOT mean to be &ldquo;vetted&rdquo;?</h3><ul><li>We are not a licensing or credentialing body</li><li>We do not provide operational supervision</li><li>Listing does not constitute an endorsement of specific service outcomes</li><li>We do not guarantee a listing match, but we make finding one easier</li></ul>",
        alignment: "left",
        sectionBackgroundColor: "#f6f7f5",
        sectionShowRadialGradient: true,
        sectionRadialGradientPosition: "bottom",
      },
    },
  ],
};

const pages = [
  {
    slug: "home",
    title: "Home",
    pageType: "home" as const,
    status: "published" as const,
    content: homeContent,
    seoTitle: "Core Platform — Modular Website Operations",
    seoDescription:
      "Find a listing owner who understands your platform experience. Core Platform connects customers of member communities, expats, and globally-mobile families with specialized listing owners.",
  },
  {
    slug: "about",
    title: "About",
    pageType: "about" as const,
    status: "published" as const,
    content: aboutContent,
    seoTitle: "About Core Platform",
    seoDescription:
      "Learn about Core Platform, our mission to support customers of member communities, and how we vet listing owners for platform competency.",
  },
  {
    slug: "contact",
    title: "Contact",
    pageType: "contact" as const,
    status: "published" as const,
    content: contactContent,
    seoTitle: "Contact Core Platform",
    seoDescription:
      "Get in touch with the Core Platform team. We're here to help you find the right listing owner or answer questions about our platform.",
  },
  {
    slug: "join",
    title: "Join as a Listing Owner",
    pageType: "custom" as const,
    status: "published" as const,
    content: joinContent,
    seoTitle: "Join the Core Platform Listing Owner Network",
    seoDescription:
      "Apply to join the Core Platform listing owner network. Reach customers and platform families who need your specialized expertise.",
  },
  {
    slug: "insights",
    title: "Insights & Articles",
    pageType: "custom" as const,
    template: "with-sidebar" as const,
    status: "published" as const,
    content: insightsContent,
    seoTitle: "Insights & Articles | Core Platform",
    seoDescription:
      "Explore articles, research, and insights for member communities.",
  },
  {
    slug: "events",
    title: "Events",
    pageType: "custom" as const,
    status: "published" as const,
    content: eventsContent,
    seoTitle: "Upcoming Events | Core Platform",
    seoDescription:
      "Explore upcoming Core Platform trainings, workshops, and community events.",
  },
  {
    slug: "recordings",
    title: "Video Archives",
    pageType: "custom" as const,
    status: "published" as const,
    content: recordingsContent,
    seoTitle: "Video Archives | Core Platform",
    seoDescription:
      "Watch past Core Platform trainings and webinars from the video archives.",
  },
  {
    slug: "portfolio",
    title: "Portfolio",
    pageType: "custom" as const,
    status: "published" as const,
    content: portfolioContent,
    seoTitle: "Portfolio | Core Platform",
    seoDescription:
      "Explore selected portfolio projects, case studies, and project outcomes.",
  },
  {
    slug: "directory",
    title: "Find a Listing Owner",
    pageType: "custom" as const,
    status: "published" as const,
    content: directoryContent,
    seoTitle: "Find a Listing Owner | Core Platform",
    seoDescription:
      "Browse listing owners by location, specialty, language, and more.",
  },
];

async function seed() {
  console.log("Seeding CMS pages...");
  for (const page of pages) {
    const existing = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.slug, page.slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(cmsPages)
        .set({
          content: page.content as any,
          status: page.status,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          publishedAt: page.status === "published" ? new Date() : existing[0].publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.slug, page.slug));
      console.log(`  [updated] ${page.slug} — id: ${existing[0].id}, status: ${page.status}`);
    } else {
      const [inserted] = await db
        .insert(cmsPages)
        .values({
          title: page.title,
          slug: page.slug,
          pageType: page.pageType,
          status: page.status,
          content: page.content as any,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoKeywords: "",
          ogImageUrl: "",
          publishedAt: page.status === "published" ? new Date() : null,
        })
        .returning();
      console.log(`  [created] ${page.slug} — id: ${inserted.id}, status: ${inserted.status}`);
    }
  }
  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
