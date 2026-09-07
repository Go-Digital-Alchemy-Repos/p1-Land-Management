import { storage } from "../storage";
import type { InsertCareerJob } from "@shared/schema";

const now = new Date();

const seededCareerJobs: InsertCareerJob[] = [
  {
    title: "Director of Community Partnerships",
    slug: "director-community-partnerships",
    department: "Partnerships",
    employmentType: "full_time",
    workMode: "hybrid",
    location: "Denver, CO",
    locationAddress: "Denver, CO",
    salaryMin: 92000,
    salaryMax: 118000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Lead strategic partnerships with international schools, nonprofits, and member community organizations.",
    description:
      "<p>The Director of Community Partnerships builds trusted relationships with organizations serving members, expatriate families, and busy professionals. This role turns shared mission into practical collaborations, referral pathways, and community programs.</p>",
    requirements:
      "<ul><li>7+ years in partnerships, community development, or nonprofit growth</li><li>Experience with international education, community support, or member communities</li><li>Strong facilitation, negotiation, and relationship-management skills</li></ul>",
    benefits:
      "<ul><li>Flexible hybrid schedule</li><li>Health, dental, and vision coverage</li><li>Professional development stipend</li><li>Generous PTO and wellness days</li></ul>",
    applicationInstructions:
      "<p>Include a brief cover letter describing a partnership you built from first conversation to measurable impact.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Director of Community Partnerships | Careers",
    metaDescription:
      "Lead Core Platform partnerships with international schools, nonprofits, and member community organizations.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Content Strategy Lead",
    slug: "content-strategy-lead",
    department: "Content",
    employmentType: "full_time",
    workMode: "remote",
    location: "Remote - United States",
    locationAddress: "",
    salaryMin: 78000,
    salaryMax: 96000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Shape accessible practical education for providers, families, and adults navigating customer identity.",
    description:
      "<p>The Content Strategy Lead plans and edits articles, guides, event curricula, and provider resources. You will partner with providers and subject matter experts to translate complex topics into humane, practical content.</p>",
    requirements:
      "<ul><li>technical writing, health education, or editorial strategy experience</li><li>Familiarity with member safety, trust, and responsible support and trauma-informed language</li><li>Excellent editing and project management skills</li></ul>",
    benefits:
      "<ul><li>Remote-first team norms</li><li>Paid continuing education</li><li>Home office stipend</li><li>Flexible Fridays</li></ul>",
    applicationInstructions:
      "<p>Please include two writing samples or links to published educational content.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Content Strategy Lead | Careers",
    metaDescription:
      "Create practical education content for Core Platform providers, families, and member communities.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Provider Success Manager",
    slug: "provider-success-manager",
    department: "Provider Network",
    employmentType: "full_time",
    workMode: "remote",
    location: "Remote - North America",
    locationAddress: "",
    salaryMin: 70000,
    salaryMax: 88000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Support listed professionals from onboarding through long-term growth and community engagement.",
    description:
      "<p>The Provider Success Manager helps verified providers thrive in the Core Platform network. You will onboard new providers, answer operational questions, surface product feedback, and create member success rituals.</p>",
    requirements:
      "<ul><li>4+ years in customer success, community operations, or member support</li><li>Comfort working with providers or regulated professionals</li><li>Excellent written communication and systems thinking</li></ul>",
    benefits:
      "<ul><li>Remote-first culture</li><li>Quarterly team retreats</li><li>Learning budget</li><li>Medical, dental, and vision plans</li></ul>",
    applicationInstructions:
      "<p>Tell us about a support system or onboarding experience you improved.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Provider Success Manager | Careers",
    metaDescription:
      "Support Core Platform providers through onboarding, engagement, and long-term success.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Senior Product Designer",
    slug: "senior-product-designer",
    department: "Product",
    employmentType: "full_time",
    workMode: "remote",
    location: "Remote",
    locationAddress: "",
    salaryMin: 110000,
    salaryMax: 145000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Design calm, trustworthy workflows for directories, applications, events, and community tools.",
    description:
      "<p>The Senior Product Designer owns end-to-end product design for Core Platform's public and admin experiences. You will make complex workflows feel organized, humane, and easy to trust.</p>",
    requirements:
      "<ul><li>6+ years designing production SaaS or marketplace products</li><li>Strong systems thinking and interaction design craft</li><li>Portfolio showing dense operational tools, not only marketing pages</li></ul>",
    benefits:
      "<ul><li>Remote-first design culture</li><li>Research and tooling budget</li><li>Flexible schedule</li><li>Health benefits</li></ul>",
    applicationInstructions:
      "<p>Share a portfolio case study that shows how you simplified a complex workflow.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Senior Product Designer | Careers",
    metaDescription:
      "Design trustworthy product workflows for Core Platform's directory, applications, events, and community tools.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Full Stack Engineer, Platform",
    slug: "full-stack-engineer-platform",
    department: "Engineering",
    employmentType: "full_time",
    workMode: "remote",
    location: "Remote - Americas",
    locationAddress: "",
    salaryMin: 125000,
    salaryMax: 165000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Build the core product systems behind CMS, directory, events, ecommerce, and Career Center modules.",
    description:
      "<p>As a Full Stack Engineer, you will work across React, Express, PostgreSQL, and integration surfaces. You will ship durable product features with thoughtful UX and reliable backend contracts.</p>",
    requirements:
      "<ul><li>5+ years building full-stack TypeScript applications</li><li>Strong React, Node, SQL, and API design skills</li><li>Care for accessibility, testing, and operational quality</li></ul>",
    benefits:
      "<ul><li>Remote-first engineering team</li><li>Equipment stipend</li><li>Open-source learning budget</li><li>Competitive healthcare coverage</li></ul>",
    applicationInstructions:
      "<p>Include links to shipped products, technical writing, or code samples if available.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Full Stack Engineer, Platform | Careers",
    metaDescription:
      "Build Core Platform's modular React, Express, and PostgreSQL product systems.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Growth Marketing Manager",
    slug: "growth-marketing-manager",
    department: "Marketing",
    employmentType: "full_time",
    workMode: "hybrid",
    location: "Austin, TX",
    locationAddress: "Austin, TX",
    salaryMin: 82000,
    salaryMax: 105000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Grow audience, provider acquisition, and program awareness through thoughtful lifecycle marketing.",
    description:
      "<p>The Growth Marketing Manager owns campaigns across email, search, partner channels, and content distribution. You will bring a measured, audience-sensitive approach to growth.</p>",
    requirements:
      "<ul><li>5+ years in B2B/B2C growth or lifecycle marketing</li><li>Experience with analytics, campaign testing, and marketing automation</li><li>Excellent messaging instincts for mission-led brands</li></ul>",
    benefits:
      "<ul><li>Hybrid flexibility</li><li>Marketing conference budget</li><li>Health and wellness benefits</li><li>Paid volunteer time</li></ul>",
    applicationInstructions:
      "<p>Share one campaign you are proud of and what you learned from the results.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Growth Marketing Manager | Careers",
    metaDescription:
      "Lead growth marketing for Core Platform's provider network, content, and community programs.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Operations Coordinator",
    slug: "operations-coordinator",
    department: "Operations",
    employmentType: "full_time",
    workMode: "hybrid",
    location: "Chicago, IL",
    locationAddress: "Chicago, IL",
    salaryMin: 54000,
    salaryMax: 68000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Keep internal operations, vendor processes, and cross-functional coordination running smoothly.",
    description:
      "<p>The Operations Coordinator supports scheduling, vendor coordination, documentation, reporting, and process upkeep across the Core Platform team.</p>",
    requirements:
      "<ul><li>2+ years in operations, administration, or program coordination</li><li>Strong attention to detail and follow-through</li><li>Comfort documenting and improving repeatable processes</li></ul>",
    benefits:
      "<ul><li>Hybrid work schedule</li><li>Health benefits</li><li>Paid holidays and wellness days</li><li>Professional development support</li></ul>",
    applicationInstructions:
      "<p>Include a short note about the tools and workflows you use to stay organized.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Operations Coordinator | Careers",
    metaDescription:
      "Coordinate operations, vendors, and documentation for the Core Platform team.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Event Program Producer",
    slug: "event-program-producer",
    department: "Events",
    employmentType: "part_time",
    workMode: "remote",
    location: "Remote",
    locationAddress: "",
    salaryMin: 42,
    salaryMax: 58,
    salaryCurrency: "USD",
    salaryPeriod: "hour",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Produce webinars, trainings, and community events from planning through post-event follow-up.",
    description:
      "<p>The Event Program Producer coordinates live trainings and webinars, manages speaker logistics, supports registration workflows, and helps turn recordings into reusable resources.</p>",
    requirements:
      "<ul><li>Experience producing virtual events or educational programs</li><li>Comfort with Zoom, event platforms, and speaker coordination</li><li>Clear communication under time-sensitive conditions</li></ul>",
    benefits:
      "<ul><li>Flexible part-time schedule</li><li>Remote work</li><li>Event production tooling stipend</li></ul>",
    applicationInstructions:
      "<p>Share examples of events or educational programs you have produced.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Event Program Producer | Careers",
    metaDescription: "Produce Core Platform webinars, trainings, and community events.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Customer Support Specialist",
    slug: "customer-support-specialist",
    department: "Support",
    employmentType: "full_time",
    workMode: "remote",
    location: "Remote - United States",
    locationAddress: "",
    salaryMin: 52000,
    salaryMax: 65000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Help providers, applicants, and visitors get unstuck with calm, clear, human support.",
    description:
      "<p>The Customer Support Specialist responds to inbound questions, documents recurring issues, and partners with product and operations teams to improve the platform experience.</p>",
    requirements:
      "<ul><li>2+ years in customer support or community support</li><li>Excellent written communication</li><li>Ability to troubleshoot web application workflows</li></ul>",
    benefits:
      "<ul><li>Remote-first schedule</li><li>Healthcare benefits</li><li>Support tooling stipend</li><li>Paid time off</li></ul>",
    applicationInstructions:
      "<p>Tell us about a time you helped someone through a confusing technical issue.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Customer Support Specialist | Careers",
    metaDescription:
      "Support Core Platform providers, applicants, and visitors with clear, humane help.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Data Analyst",
    slug: "data-analyst",
    department: "Analytics",
    employmentType: "full_time",
    workMode: "remote",
    location: "Remote",
    locationAddress: "",
    salaryMin: 85000,
    salaryMax: 110000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Turn product, provider, and community data into trustworthy insights and operational dashboards.",
    description:
      "<p>The Data Analyst builds reporting systems that help Core Platform understand growth, provider success, applications, events, and user behavior without losing sight of privacy and trust.</p>",
    requirements:
      "<ul><li>4+ years in analytics, BI, or data operations</li><li>Strong SQL and dashboard-building experience</li><li>Comfort communicating findings to non-technical teams</li></ul>",
    benefits:
      "<ul><li>Remote work</li><li>Analytics tooling budget</li><li>Health benefits</li><li>Flexible PTO</li></ul>",
    applicationInstructions:
      "<p>Include an example of a dashboard or analysis that changed a team decision.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Data Analyst | Careers",
    metaDescription:
      "Build analytics and dashboards for Core Platform product, provider, and community data.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "People & Culture Generalist",
    slug: "people-culture-generalist",
    department: "People",
    employmentType: "full_time",
    workMode: "hybrid",
    location: "New York, NY",
    locationAddress: "New York, NY",
    salaryMin: 76000,
    salaryMax: 94000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary:
      "Support recruiting, onboarding, employee experience, and values-aligned people operations.",
    description:
      "<p>The People & Culture Generalist helps create a healthy, thoughtful workplace as Core Platform grows. You will support recruiting coordination, onboarding, policy documentation, and employee experience rituals.</p>",
    requirements:
      "<ul><li>3+ years in people operations, HR, or recruiting coordination</li><li>Strong judgment with sensitive information</li><li>Interest in inclusive, globally aware workplace practices</li></ul>",
    benefits:
      "<ul><li>Hybrid schedule</li><li>Health benefits</li><li>Professional development support</li><li>Wellness stipend</li></ul>",
    applicationInstructions:
      "<p>Share a people process you improved and how you measured success.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "People & Culture Generalist | Careers",
    metaDescription: "Support recruiting, onboarding, and people operations at Core Platform.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Intern, Research & Resource Library",
    slug: "intern-research-resource-library",
    department: "Research",
    employmentType: "internship",
    workMode: "remote",
    location: "Remote",
    locationAddress: "",
    salaryMin: 22,
    salaryMax: 28,
    salaryCurrency: "USD",
    salaryPeriod: "hour",
    salaryVisible: true,
    status: "published",
    visibility: "public",
    summary: "Help organize research, resources, and references for platform-approved education.",
    description:
      "<p>The Research & Resource Library Intern supports literature scans, resource tagging, citation cleanup, and content preparation for provider education materials.</p>",
    requirements:
      "<ul><li>Current undergraduate or graduate student in psychology, social work, education, public health, or related field</li><li>Strong research organization skills</li><li>Careful citation and source management habits</li></ul>",
    benefits:
      "<ul><li>Remote internship</li><li>Mentorship from content and operations leads</li><li>Flexible schedule around coursework</li></ul>",
    applicationInstructions:
      "<p>Include your area of study and a short note about your interest in member community support.</p>",
    publishedAt: now,
    closesAt: null,
    metaTitle: "Research & Resource Library Intern | Careers",
    metaDescription:
      "Support Core Platform research, resource tagging, and provider education materials.",
    noindex: false,
    integrationMetadata: {},
    createdBy: null,
    updatedBy: null,
  },
];

export async function ensureSystemCareers() {
  for (const job of seededCareerJobs) {
    const existing = await storage.careers.getJobBySlug(job.slug);
    if (!existing) {
      await storage.careers.createJob(job);
    }
  }
}
