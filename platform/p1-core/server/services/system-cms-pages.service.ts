import { randomUUID } from "crypto";
import { storage } from "../storage";
import { mergeJoinHeroBlocks, type CmsBuilderBlock } from "@shared/cms-blocks";
import type { SidebarWidget } from "@shared/schema";

function id() {
  return randomUUID();
}

function buildInsightsContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "section-header",
        props: {
          eyebrow: "Core Platform Blog",
          title: "Insights & Articles",
          subtitle: "Explore articles, research, and insights for member communities.",
          alignment: "center",
        },
      },
      {
        id: id(),
        type: "blog-featured-post",
        props: {
          title: "Featured Article",
          layout: "split",
        },
      },
      {
        id: id(),
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
}

function buildEventsContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "events-archive",
        props: {
          heading: "Upcoming Events",
          subheading:
            "We offer quarterly platform-approved trainings for professional providers. All of our members get free registration to the events below.",
          defaultView: "list",
          showViewToggle: true,
        },
      },
    ],
  };
}

function buildCareersContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "hero",
        props: {
          badge: "Career Center",
          heading: "Build Belonging With Us",
          subheading:
            "Join a team creating practical tools, trusted community, and trusted operational workflows for customers, teams, and organizations.",
          primaryText: "View Open Roles",
          primaryLink: "#open-roles",
          primaryAction: "internal-link",
          secondaryText: "",
          secondaryLink: "",
          layout: "stacked",
          minHeight: "420",
          overlayOpacity: 45,
          backgroundImageUrl:
            "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1800&h=1000&fit=crop&crop=faces",
          backgroundPositionX: 50,
          backgroundPositionY: 50,
        },
      },
      {
        id: id(),
        type: "cards-grid",
        props: {
          title: "How We Work",
          subtitle:
            "Core Platform is built by people who care about trust, nuance, and practical support across cultures.",
          columns: "3",
          cards: [
            {
              title: "Mission-led",
              description:
                "We build tools for communities that are often misunderstood by one-size-fits-all systems.",
              icon: "Heart",
            },
            {
              title: "Thoughtful craft",
              description:
                "Our product, content, and operations work should feel calm, useful, and carefully made.",
              icon: "BadgeCheck",
            },
            {
              title: "Remote-friendly",
              description:
                "Many roles are remote or hybrid, with rhythms designed for clear collaboration.",
              icon: "Globe",
            },
          ],
        },
      },
      {
        id: id(),
        type: "career-listings",
        props: {
          eyebrow: "Open Roles",
          heading: "Current Job Listings",
          subheading:
            "Search open positions by department, location, work mode, and role type. Each listing includes direct application through the Career Center.",
          htmlAnchor: "open-roles",
        },
      },
    ],
  };
}

function buildPortfolioContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "portfolio-grid",
        props: {
          eyebrow: "Featured Case Study",
          heading: "Featured Portfolio Project",
          subheading: "A closer look at selected work, project context, and measurable outcomes.",
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
        id: id(),
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
}

function buildRecordingsContent() {
  return {
    blocks: [
      {
        id: id(),
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
}

function buildShopContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "section-header",
        props: {
          eyebrow: "Shop",
          title: "Core Platform Resources",
          subtitle:
            "Browse practical guides, trainings, and family tools for customer transitions, belonging, and platform-approved workflows.",
          alignment: "center",
          headingLevel: "h1",
        },
      },
    ],
  };
}

function buildDirectoryContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "directory-browser",
        props: {
          heading: "Find a Verified Provider",
          subheading:
            "Search for platform-approved workflows by specialty, location, language, or session format, then explore results on the map.",
          showCategoryChips: true,
          showMap: true,
        },
      },
      {
        id: id(),
        type: "text-image",
        props: {
          heading: "Why Platform Approved?",
          body: "Traditional support models were developed within a single cultural framework. When members bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A verified provider understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.",
          imageUrl:
            "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=1200&fit=crop&crop=faces",
          imageAlt: "platform-approved support",
          imagePosition: "left",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          title: 'What does it mean to be "vetted"?',
          subtitle: "And just as importantly, what it does not mean.",
          content:
            "<h3>What does it mean to be &ldquo;vetted&rdquo;?</h3><ul><li>Every verified provider completes a detailed application process</li><li>Credentials and licensure are verified</li><li>Training or lived experience with member and relevant communities is required</li><li>Profiles are reviewed by our team before being published</li></ul><h3>What does it NOT mean to be &ldquo;vetted&rdquo;?</h3><ul><li>We are not a licensing or credentialing body</li><li>We do not provide operational supervision</li><li>Listing does not constitute an endorsement of specific service outcomes</li><li>We do not guarantee a service match, but we make finding one easier</li></ul>",
          alignment: "left",
          sectionBackgroundColor: "#f6f7f5",
          sectionShowRadialGradient: true,
          sectionRadialGradientPosition: "bottom",
        },
      },
    ],
  };
}

function buildAboutContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "text-image",
        props: {
          heading: "History",
          body: 'Core Platform was born from the lived experience of growing up between cultures. Our founders, adult members and community advocates, experienced firsthand how difficult it is to find a verified provider who truly understands what it means to call multiple countries "home." In 2024, they set out to build a bridge between members of member communities and the culturally competent professionals who serve them.',
          imageUrl:
            "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=1200&fit=crop&crop=faces",
          imageAlt: "platform community",
          imagePosition: "right",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          title: "Vision & Mission",
          alignment: "left",
          content:
            "<p>Our vision is a world where every member of a member community has access to specialized support that honors their multi-team identity. Our mission is to build the most trusted directory of verified providers: vetted, accessible, and global, so that no one has to navigate the complexities of platform life alone.</p>",
        },
      },
      {
        id: id(),
        type: "cards-grid",
        props: {
          title: "The Stats Speak for Themselves",
          subtitle: "According to internal platform research across member communities:",
          columns: "3",
          cards: [
            {
              title: "60%",
              description: "of members experienced symptoms of anxiety.",
              icon: "CircleGauge",
            },
            {
              title: "59%",
              description: "of members experienced symptoms of depression.",
              icon: "CircleGauge",
            },
            {
              title: "47%",
              description: "of members experienced symptoms of suicidal ideation.",
              icon: "CircleGauge",
            },
          ],
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          alignment: "center",
          content:
            "<p>However, significantly smaller numbers get diagnosed. While we can only speculate on why, due to our decades of observations and expertise in the field, we think a large reason is due to lack of accessibility to proper specialized services. <strong>Which is a major driver in why we do what we do!</strong></p>",
        },
      },
      {
        id: id(),
        type: "text-image",
        props: {
          heading: "Why Platform Approved?",
          body: "Traditional support models were developed within a single cultural framework. When members bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A verified provider understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges, and they know how to work with both.",
          imageUrl:
            "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=1200&fit=crop&crop=faces",
          imageAlt: "platform-approved support",
          imagePosition: "left",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          title: 'What does it mean to be "vetted"?',
          subtitle: "And just as importantly, what it does not mean.",
          content:
            "<h3>What does it mean to be &ldquo;vetted&rdquo;?</h3><ul><li>Every verified provider completes a detailed application process</li><li>Credentials and licensure are verified</li><li>Training or lived experience with member and relevant communities is required</li><li>Profiles are reviewed by our team before being published</li></ul><h3>What does it NOT mean to be &ldquo;vetted&rdquo;?</h3><ul><li>We are not a licensing or credentialing body</li><li>We do not provide operational supervision</li><li>Listing does not constitute an endorsement of specific service outcomes</li><li>We do not guarantee a service match, but we make finding one easier</li></ul>",
          alignment: "left",
        },
      },
      {
        id: id(),
        type: "testimonials",
        props: {
          title: "What Are People Saying?",
          subtitle:
            "Hear from members, expat families, and verified providers who have found their match.",
          items: [
            {
              quote:
                "For the first time, I didn't have to explain what it means to grow up between cultures. My verified provider just understood.",
              name: "Sarah M.",
              role: "Adult Community Member",
              location: "Singapore",
            },
            {
              quote:
                "Core Platform connected me with a verified provider who speaks my language, literally and figuratively. It's been life-changing.",
              name: "James K.",
              role: "Expat Parent",
              location: "Dubai",
            },
            {
              quote:
                "As a verified provider, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
              name: "Dr. Amara O.",
              role: "Verified Provider",
              location: "Nairobi",
            },
          ],
        },
      },
      {
        id: id(),
        type: "blog-preview",
        props: {
          title: "Featured On",
          subtitle: "",
          limit: 3,
          enableHoverMotion: true,
        },
      },
      {
        id: id(),
        type: "faq",
        props: {
          title: "FAQs",
          items: [
            {
              question: "What is a member of a member community (Core Platform)?",
              answer:
                "A member of a member community (Core Platform) is a person who has spent a significant part of their developmental years outside their parents' culture. They build relationships with multiple cultures while not having full ownership of any, creating a blended cultural framework shaped by passport countries, host countries, and communities.",
            },
            {
              question: "Who can use Core Platform to find a verified provider?",
              answer:
                "Core Platform is for anyone who has had a platform upbringing or is navigating globally-mobile life: members of all ages, expat families, international students, military families, missionary kids, diplomats' children, and platform professionals.",
            },
            {
              question: "How are verified providers vetted before joining the directory?",
              answer:
                "Every verified provider completes an application process, provides verified credentials, and must demonstrate training or lived experience with member and relevant communities. Our team reviews each profile before it goes live in the directory.",
            },
            {
              question: "Is Core Platform a support service?",
              answer:
                "No. Core Platform is a directory and community platform. We connect individuals with qualified verified providers; we do not provide support directly.",
            },
          ],
        },
      },
      {
        id: id(),
        type: "cta",
        props: {
          heading: "Donate to Core Platform",
          subheading:
            "Your support helps us maintain this platform, expand our directory, and provide resources to the global member community.",
          primaryText: "Donate",
          primaryLink: "/donate",
          primaryAction: "internal-link",
          primaryOpenInNewTab: false,
          primaryFormSlug: "contact-form",
          primaryModalTitle: "",
          primaryModalDescription: "",
          secondaryText: "",
          secondaryLink: "",
          secondaryAction: "internal-link",
          secondaryOpenInNewTab: false,
          secondaryFormSlug: "contact-form",
          secondaryModalTitle: "",
          secondaryModalDescription: "",
          variant: "light",
        },
      },
    ],
  };
}

function buildPrivacyPolicyContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "section-header",
        props: {
          eyebrow: "Legal",
          title: "Privacy Policy",
          subtitle:
            "This placeholder privacy policy is provided as a starting point and should be reviewed and customized for your organization, jurisdiction, data flows, and legal obligations.",
          alignment: "left",
          headingLevel: "h1",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          alignment: "left",
          content:
            "<p><strong>Last updated:</strong> April 12, 2026</p><p>Core Platform respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you visit our website, use our directory, engage with our events, submit forms, or otherwise interact with our services.</p><h2>1. Information We Collect</h2><p>We may collect personal information you voluntarily provide, such as your name, email address, phone number, professional information, billing details, event registration information, application materials, and any content you submit through forms or account features. We may also collect usage data automatically, including browser type, device information, IP address, referral source, pages viewed, and interactions with our website.</p><h2>2. How We Use Information</h2><p>We may use information we collect to operate and improve the website, manage directory listings, process applications, facilitate event registrations, communicate with you, respond to inquiries, provide customer support, send newsletters or updates where permitted, protect the platform, enforce our policies, and comply with legal obligations.</p><h2>3. Cookies and Analytics</h2><p>We may use cookies, analytics tools, pixels, and similar technologies to understand site performance, remember preferences, improve user experience, and support marketing or reporting efforts. You may be able to control some cookie preferences through your browser settings.</p><h2>4. How We Share Information</h2><p>We may share information with service providers and vendors that help us operate the platform, such as hosting, email delivery, analytics, payments, file storage, and customer support providers. We may also disclose information when required by law, to protect rights or safety, in connection with a business transfer, or with your consent. We do not sell personal information unless explicitly stated otherwise in a future updated policy.</p><h2>5. Directory and Public Profile Information</h2><p>If you are a listed verified provider, certain profile information may be publicly displayed, including your professional name, credentials, specializations, biography, service details, and other information you choose or are required to include in your directory profile. Please avoid including confidential or unnecessary personal data in publicly visible fields.</p><h2>6. Data Retention</h2><p>We retain personal information for as long as reasonably necessary to provide services, maintain records, resolve disputes, comply with legal obligations, and enforce our agreements. Retention periods may vary depending on the type of information and the purpose for which it was collected.</p><h2>7. Security</h2><p>We use reasonable administrative, technical, and organizational safeguards designed to protect personal information. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.</p><h2>8. Your Rights and Choices</h2><p>Depending on your location, you may have rights relating to access, correction, deletion, objection, restriction, portability, or withdrawal of consent. You may also opt out of marketing communications using the unsubscribe link in those messages or by contacting us directly.</p><h2>9. Children's Privacy</h2><p>Our services are not intended for children under the age required by applicable law to consent independently, and we do not knowingly collect personal information from children in a manner prohibited by law. If you believe a child has submitted personal information to us improperly, please contact us so we can review and address the situation.</p><h2>10. International Data Transfers</h2><p>If you access the website from outside the country in which our systems are operated, your information may be transferred to, stored in, or processed in another jurisdiction where privacy laws may differ from those in your location.</p><h2>11. Third-Party Links and Services</h2><p>Our website may contain links to third-party websites, embedded tools, maps, payment platforms, social media services, or other external services. We are not responsible for the privacy practices of third parties, and you should review their policies separately.</p><h2>12. Changes to This Policy</h2><p>We may update this Privacy Policy from time to time. Updated versions will be posted on this page with a revised effective or last-updated date. Continued use of the website after changes become effective constitutes acceptance of the updated policy, where permitted by law.</p><h2>13. Contact Us</h2><p>If you have questions about this Privacy Policy or your personal information, please contact us through the contact information listed on the website. Replace this paragraph in the CMS with your organization’s preferred legal/privacy contact details.</p>",
        },
      },
    ],
  };
}

function buildTermsOfServiceContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "section-header",
        props: {
          eyebrow: "Legal",
          title: "Terms of Service",
          subtitle:
            "This placeholder terms of service page is intended as editable starter language and should be reviewed and customized to match your operations, services, and legal requirements.",
          alignment: "left",
          headingLevel: "h1",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          alignment: "left",
          content:
            "<p><strong>Last updated:</strong> April 12, 2026</p><p>These Terms of Service govern your access to and use of the Core Platform website, directory, applications, events, content, and related services. By accessing or using the website, you agree to be bound by these Terms. If you do not agree, do not use the services.</p><h2>1. Eligibility and Acceptable Use</h2><p>You agree to use the website only for lawful purposes and in accordance with these Terms. You may not misuse the platform, attempt unauthorized access, interfere with security, upload malicious content, scrape or copy data in prohibited ways, impersonate others, or use the site in a manner that could damage the platform or other users.</p><h2>2. Informational and Directory Nature of the Service</h2><p>Core Platform provides a platform, directory, educational content, and related resources. Unless explicitly stated otherwise, we do not provide support, medical care, diagnosis, legal advice, or emergency services. Directory listings are provided for informational purposes and do not guarantee service outcomes, availability, or suitability.</p><h2>3. No Crisis or Emergency Service</h2><p>The website is not a crisis service. If you or another person is in immediate danger or experiencing an emergency, call local emergency services or contact an appropriate crisis resource immediately.</p><h2>4. Accounts and Submissions</h2><p>If you create an account, apply for membership, submit a listing, register for an event, or send information through forms, you agree to provide accurate and current information and to keep your credentials secure. You are responsible for activity occurring under your account and for information you submit.</p><h2>5. Verified Provider Listings</h2><p>If you apply to be listed as a professional, you represent that information you provide is accurate and that you have the qualifications, licensure, training, and permissions required to offer your services. We reserve the right to review, approve, reject, suspend, edit, or remove listings at our discretion, subject to applicable law and any separate agreements.</p><h2>6. Payments, Events, and Purchases</h2><p>Certain features may involve paid registrations, subscriptions, or digital purchases. Pricing, billing cycles, refund terms, and access conditions may be described at the point of purchase or in related policies. You agree to provide valid payment information and authorize charges as described when you complete a transaction.</p><h2>7. Intellectual Property</h2><p>Unless otherwise indicated, the website, branding, design, text, graphics, software, original content, and related materials are owned by or licensed to Core Platform and are protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or exploit site content beyond permitted personal or internal business use without prior written permission.</p><h2>8. User Content</h2><p>If you submit content, including profile details, testimonials, comments, media, or other materials, you grant us a non-exclusive, worldwide, royalty-free license to host, reproduce, display, adapt, and use that content as reasonably necessary to operate, promote, and improve the services. You represent that you have the rights needed to submit such content.</p><h2>9. Third-Party Services and Links</h2><p>The website may include links to third-party websites, maps, payment processors, analytics providers, email tools, or other external services. We do not control third-party services and are not responsible for their content, availability, or practices.</p><h2>10. Disclaimers</h2><p>The services are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis to the fullest extent permitted by law. We disclaim warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability.</p><h2>11. Limitation of Liability</h2><p>To the fullest extent permitted by law, Core Platform and its affiliates, officers, employees, contractors, and partners will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages, or for loss of profits, data, goodwill, business interruption, or personal outcomes resulting from use of or inability to use the services.</p><h2>12. Indemnification</h2><p>You agree to defend, indemnify, and hold harmless Core Platform and its affiliates, personnel, and partners from claims, liabilities, damages, judgments, losses, costs, and expenses arising from your use of the services, your submissions, your violation of these Terms, or your violation of applicable law or third-party rights.</p><h2>13. Termination</h2><p>We may suspend or terminate access to the website or specific features at any time, with or without notice, if we believe you have violated these Terms, created risk, or if continued operation of a feature is no longer practical.</p><h2>14. Governing Law and Disputes</h2><p>These Terms should be customized in the CMS to reflect your governing law, venue, dispute resolution process, and any jurisdiction-specific requirements. Replace this section with approved legal language before final publication if needed.</p><h2>15. Changes to These Terms</h2><p>We may update these Terms from time to time. Revised versions will be posted on this page with an updated date. Your continued use of the services after changes become effective constitutes acceptance of the revised Terms, where permitted by law.</p><h2>16. Contact</h2><p>If you have questions about these Terms, please contact us using the contact information provided on the website. Replace this paragraph in the CMS with your organization’s preferred legal contact details.</p>",
        },
      },
    ],
  };
}

function buildDisclaimerContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "section-header",
        props: {
          eyebrow: "Legal",
          title: "Disclaimer",
          subtitle:
            "Review emergency guidance, directory vetting boundaries, and important information to keep in mind when using the Core Platform directory and related services.",
          alignment: "left",
          headingLevel: "h1",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          alignment: "left",
          content:
            '<p><strong>If you or someone you know is experiencing a health or safety emergency:</strong> In the U.S. please call <strong>988</strong> for the Suicide and Crisis Lifeline. For other emergencies call <strong>911</strong>. Outside the U.S. find international suicide hotlines <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener noreferrer">here</a>. For other emergencies, find help <a href="https://www.who.int/health-topics/emergency-care" target="_blank" rel="noopener noreferrer">here</a>.</p><p>Core Platform conducts a vetting process to ensure that each listed provider is platform-approved. This process includes an application, an interview, and a background check, and approved providers have access to ongoing platform-approved training opportunities.</p><p>Neither Core Platform nor Interaction International evaluates or verifies providers&apos; qualifications, scope of practice, or expertise outside of platform-approved workflows. Individuals are encouraged to use their own discernment when determining whether a provider is an appropriate fit for their specific needs. <a href="/about">Learn more about what it means to be vetted</a>.</p>',
        },
      },
    ],
  };
}

function buildDefaultBlogSidebarWidgets(): SidebarWidget[] {
  return [
    {
      id: id(),
      type: "search",
      title: "Search",
      settings: {},
    },
    {
      id: id(),
      type: "recent-posts",
      title: "Recent Posts",
      settings: { limit: 5 },
    },
    {
      id: id(),
      type: "categories",
      title: "Categories",
      settings: {},
    },
    {
      id: id(),
      type: "tag-cloud",
      title: "Popular Topics",
      settings: {},
    },
    {
      id: id(),
      type: "newsletter",
      title: "Stay Connected",
      settings: {
        description: "Get platform-approved articles, events, and resources in your inbox.",
        buttonText: "Sign Up",
        formSlug: "newsletter-signup",
      },
    },
  ];
}

function contentWithMergedJoinHero(rawContent: unknown): Record<string, unknown> | null {
  if (!rawContent || typeof rawContent !== "object") return null;

  const content = rawContent as Record<string, unknown>;
  if (!Array.isArray(content.blocks)) return null;

  const blocks = content.blocks as CmsBuilderBlock[];
  const mergedBlocks = mergeJoinHeroBlocks(blocks);

  if (JSON.stringify(blocks) === JSON.stringify(mergedBlocks)) {
    return null;
  }

  return {
    ...content,
    blocks: mergedBlocks,
  };
}

function isLegacyPortfolioContent(rawContent: unknown) {
  if (!rawContent || typeof rawContent !== "object") return false;

  const content = rawContent as Record<string, unknown>;
  if (!Array.isArray(content.blocks)) return false;

  const blocks = content.blocks as Array<{ type?: string; props?: Record<string, unknown> }>;
  return blocks.length === 1 && blocks[0]?.type === "portfolio-grid";
}

export async function ensureSystemCmsPages() {
  const defaultBlogSidebar = await storage.cmsSidebars.getDefault();
  if (!defaultBlogSidebar) {
    await storage.cmsSidebars.create({
      name: "Blog Sidebar",
      description: "Default sidebar for Insights & Articles and blog posts.",
      isDefault: true,
      widgets: buildDefaultBlogSidebarWidgets(),
    });
  }

  const existingInsights = await storage.cmsPages.getPageBySlug("insights");
  if (!existingInsights) {
    await storage.cmsPages.createPage({
      title: "Insights & Articles",
      slug: "insights",
      pageType: "custom",
      template: "with-sidebar",
      status: "published",
      content: buildInsightsContent(),
      seoTitle: "Insights & Articles | Core Platform",
      seoDescription: "Explore articles, research, and insights for member communities.",
      seoKeywords: "",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  } else if (existingInsights.template !== "with-sidebar") {
    await storage.cmsPages.updatePage(existingInsights.id, {
      template: "with-sidebar",
      updatedBy: existingInsights.updatedBy,
    });
  }

  const existingEvents = await storage.cmsPages.getPageBySlug("events");
  if (!existingEvents) {
    await storage.cmsPages.createPage({
      title: "Events",
      slug: "events",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildEventsContent(),
      seoTitle: "Upcoming Events | Core Platform",
      seoDescription: "Explore upcoming Core Platform trainings, workshops, and community events.",
      seoKeywords: "",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingCareers = await storage.cmsPages.getPageBySlug("careers");
  if (!existingCareers) {
    await storage.cmsPages.createPage({
      title: "Careers",
      slug: "careers",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildCareersContent(),
      seoTitle: "Careers | Core Platform",
      seoDescription: "Explore open roles and apply to join the Core Platform team.",
      seoKeywords: "Core Platform careers, jobs, hiring, open roles",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingPortfolio = await storage.cmsPages.getPageBySlug("portfolio");
  if (!existingPortfolio) {
    await storage.cmsPages.createPage({
      title: "Portfolio",
      slug: "portfolio",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildPortfolioContent(),
      seoTitle: "Portfolio | Core Platform",
      seoDescription: "Explore selected portfolio projects, case studies, and project outcomes.",
      seoKeywords: "portfolio, case studies, project outcomes, selected work",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  } else if (isLegacyPortfolioContent(existingPortfolio.content)) {
    await storage.cmsPages.updatePage(existingPortfolio.id, {
      content: buildPortfolioContent(),
      template: "full-width",
      updatedBy: existingPortfolio.updatedBy,
    });
  }

  const existingRecordings = await storage.cmsPages.getPageBySlug("recordings");
  if (!existingRecordings) {
    await storage.cmsPages.createPage({
      title: "Video Archives",
      slug: "recordings",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildRecordingsContent(),
      seoTitle: "Video Archives | Core Platform",
      seoDescription: "Watch past Core Platform trainings and webinars from the video archives.",
      seoKeywords: "",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingShop = await storage.cmsPages.getPageBySlug("shop");
  if (!existingShop) {
    await storage.cmsPages.createPage({
      title: "Shop",
      slug: "shop",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildShopContent(),
      seoTitle: "Shop Core Platform Resources | Core Platform",
      seoDescription:
        "Browse Core Platform resources, digital workbooks, family tools, and provider training products.",
      seoKeywords:
        "Core Platform shop, digital resources, provider training, family transition tools",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingDirectory = await storage.cmsPages.getPageBySlug("directory");
  if (!existingDirectory) {
    await storage.cmsPages.createPage({
      title: "Find a Verified Provider",
      slug: "directory",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildDirectoryContent(),
      seoTitle: "Find a Verified Provider | Core Platform",
      seoDescription: "Browse verified providers by location, specialty, language, and more.",
      seoKeywords: "",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingJoin = await storage.cmsPages.getPageBySlug("join");
  if (existingJoin) {
    const mergedContent = contentWithMergedJoinHero(existingJoin.content);
    if (mergedContent) {
      await storage.cmsPages.updatePage(existingJoin.id, {
        content: mergedContent,
        updatedBy: existingJoin.updatedBy,
      });
    }
  }

  const existingAbout = await storage.cmsPages.getPageBySlug("about");
  if (!existingAbout) {
    await storage.cmsPages.createPage({
      title: "About",
      slug: "about",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildAboutContent(),
      seoTitle: "About | Core Platform",
      seoDescription:
        "Learn about Core Platform, our mission, and how we connect members of member communities with verified listing owners.",
      seoKeywords:
        "about Core Platform, members of member communities, culturally informed care, verified provider directory",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingPrivacyPolicy = await storage.cmsPages.getPageBySlug("privacy-policy");
  if (!existingPrivacyPolicy) {
    await storage.cmsPages.createPage({
      title: "Privacy Policy",
      slug: "privacy-policy",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildPrivacyPolicyContent(),
      seoTitle: "Privacy Policy | Core Platform",
      seoDescription:
        "Review the Core Platform privacy policy and how personal information is collected, used, and protected.",
      seoKeywords: "privacy policy, data privacy, Core Platform privacy",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingTermsOfService = await storage.cmsPages.getPageBySlug("terms-of-service");
  if (!existingTermsOfService) {
    await storage.cmsPages.createPage({
      title: "Terms of Service",
      slug: "terms-of-service",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildTermsOfServiceContent(),
      seoTitle: "Terms of Service | Core Platform",
      seoDescription:
        "Review the Core Platform terms of service for use of the website, directory, events, and related services.",
      seoKeywords: "terms of service, terms and conditions, Core Platform terms",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }

  const existingDisclaimer = await storage.cmsPages.getPageBySlug("disclaimer");
  if (!existingDisclaimer) {
    await storage.cmsPages.createPage({
      title: "Disclaimer",
      slug: "disclaimer",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildDisclaimerContent(),
      seoTitle: "Disclaimer | Core Platform",
      seoDescription:
        "Review emergency guidance, directory vetting limitations, and important information about using the Core Platform platform.",
      seoKeywords: "disclaimer, emergency guidance, directory disclaimer, Core Platform disclaimer",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }
}
