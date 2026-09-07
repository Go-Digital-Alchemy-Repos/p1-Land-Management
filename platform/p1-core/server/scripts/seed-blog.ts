import { db } from "../db";
import { blogPosts } from "@shared/schema";

const posts = [
  {
    title: "Designing a Member-Friendly Onboarding Flow",
    slug: "member-friendly-onboarding-flow",
    excerpt:
      "Practical ways to make setup, profile completion, and first actions feel clear for new members and providers.",
    content: `A strong onboarding flow helps people understand what to do next without overwhelming them. The best flows focus on a few clear milestones: account setup, profile completion, verification, and the first meaningful action.

Start With Orientation

Use plain language for each step and explain why it matters. People are more likely to complete setup when the platform connects each request to a visible benefit.

Keep Progress Visible

Progress indicators, saved drafts, and clear status labels reduce uncertainty. When a member leaves and returns later, the interface should make the next step obvious.

Reduce Repetition

Ask for information once, reuse it where appropriate, and make edits easy. Good onboarding feels like a guided path, not a stack of forms.

Support Review Workflows

If your site includes approvals, references, payments, or verification, set expectations early. Clear statuses and friendly notifications help applicants trust the process.`,
    coverImageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop",
    authorName: "Core Platform Team",
    category: "Operations",
    tags: ["Onboarding", "Members", "UX", "Operations"],
    isPublished: true,
    publishedAt: new Date("2026-03-08"),
  },
  {
    title: "Building Trust in a Public Directory",
    slug: "building-trust-public-directory",
    excerpt:
      "Directories work best when visitors can quickly understand who is listed, what is verified, and how to compare options.",
    content: `A public directory is only useful when visitors can make confident decisions. Trust starts with clear labels, consistent profiles, and transparent review standards.

Show What Is Verified

Badges and profile fields should describe what your organization has actually reviewed. Avoid vague claims and make sure verification language matches the real workflow behind it.

Make Comparison Easy

Consistent profile sections help visitors compare service areas, availability, location, credentials, and contact options. Filters should match the data people care about most.

Keep Profiles Current

Stale listings weaken trust. Give listing owners simple tools to update status, contact details, services, and availability, and remind them when key fields need review.

Respect Different Install Types

A configurable platform should support providers, locations, vendors, programs, or custom listing types without forcing one industry vocabulary into every site.`,
    coverImageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=450&fit=crop",
    authorName: "Core Platform Team",
    category: "Directory",
    tags: ["Directory", "Trust", "Profiles", "Verification"],
    isPublished: true,
    publishedAt: new Date("2026-03-05"),
  },
  {
    title: "Planning Events That Are Easy to Join",
    slug: "planning-events-easy-to-join",
    excerpt:
      "A short checklist for event pages, registrations, reminders, and follow-up that make participation smoother.",
    content: `Event experiences start before the event begins. A helpful event page answers the practical questions first: who it is for, when it happens, where it happens, what it costs, and how registration works.

Clarify the Format

Use consistent labels for virtual, in-person, and hybrid events. If an event has limited capacity, waitlists, or member-only access, make that visible before checkout or registration.

Make Reminders Useful

Confirmation emails and reminders should include the date, time zone, join link or address, cancellation details, and contact information. Good reminders reduce support requests.

Design for Follow-Up

After the event, attendees may need recordings, resources, invoices, feedback forms, or next-step links. Treat follow-up as part of the event workflow, not an afterthought.

Review What Worked

Track registrations, attendance, waitlists, and feedback. A simple review rhythm helps each event become easier to run than the last.`,
    coverImageUrl:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=450&fit=crop",
    authorName: "Core Platform Team",
    category: "Events",
    tags: ["Events", "Registration", "Operations", "Members"],
    isPublished: true,
    publishedAt: new Date("2026-03-01"),
  },
  {
    title: "Why Save States Matter in Admin Tools",
    slug: "why-save-states-matter-admin-tools",
    excerpt:
      "Consistent save feedback helps editors trust that their changes are protected and published intentionally.",
    content: `Admin tools are full of small trust moments. Save buttons, dirty-state warnings, success messages, and error states all tell editors whether the system is protecting their work.

Use One Pattern Everywhere

Editors should not have to relearn save behavior on every page. A shared save bar, consistent button order, and predictable toast language make the product feel calmer and safer.

Protect In-Progress Work

Unsaved-change guards are most useful when they are specific and respectful. Warn before destructive navigation, but avoid noisy prompts when there is nothing to lose.

Separate Drafts From Publishing

Saving content and publishing content are different decisions. Clear statuses, preview links, and timestamps help teams understand what visitors can actually see.

Design for Recovery

When a save fails, explain what happened and keep the editor's work on screen. The best error state gives people a next action without panic.`,
    coverImageUrl:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=450&fit=crop",
    authorName: "Core Platform Team",
    category: "Admin UX",
    tags: ["Admin", "UX", "Publishing", "Reliability"],
    isPublished: true,
    publishedAt: new Date("2026-02-25"),
  },
  {
    title: "Keeping Public Themes Out of Admin Chrome",
    slug: "keeping-public-themes-out-of-admin-chrome",
    excerpt:
      "Public CMS themes should style visitor content and previews without leaking into the admin workspace.",
    content: `Theme systems are powerful because they let each site feel distinct. They also need clear boundaries. Public theme variables should shape visitor pages and preview surfaces, while admin chrome should remain stable and predictable.

Keep Contexts Separate

The admin interface is a work surface. It should keep consistent navigation, contrast, controls, and typography even while previewing a public page with a very different theme.

Preview Honestly

Editors still need to see public content as visitors will see it. A dedicated preview root or iframe can apply public theme variables intentionally without changing the surrounding admin shell.

Test the Boundary

Regression tests should confirm that theme classes and CSS variable overrides do not land on the document root or persistent admin layout. This protects both brand flexibility and editor usability.`,
    coverImageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop",
    authorName: "Core Platform Team",
    category: "Design System",
    tags: ["Themes", "CMS", "Admin", "Design System"],
    isPublished: true,
    publishedAt: new Date("2026-02-20"),
  },
];

export async function seedBlogPosts(
  options: { refreshExisting?: boolean } = { refreshExisting: true },
) {
  const updatedAt = new Date();
  for (const post of posts) {
    const insert = db.insert(blogPosts).values(post);

    if (options.refreshExisting) {
      await insert.onConflictDoUpdate({
        target: blogPosts.slug,
        set: {
          ...post,
          updatedAt,
        },
      });
    } else {
      await insert.onConflictDoNothing({ target: blogPosts.slug });
    }
  }
  console.log(
    options.refreshExisting
      ? `Seeded or updated ${posts.length} blog posts.`
      : `Ensured ${posts.length} blog posts.`,
  );
}
