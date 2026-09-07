# Blog Workflow

Insights & Articles is the blog area for Core Platform. The blog system supports managed posts, categories, tags, featured layouts, sidebar presentation, and moderated comments.

## Blog Tabs

The main Blog screen is split into three working areas:

- `Blog Posts` for the post list and new-post creation
- `Blog Settings` for sitewide blog behavior
- `Comments` for comment moderation and review

## Core Publishing Flow

1. Create or edit a post under Blog > Posts.
2. Assign an existing category and any relevant tags.
3. Add a featured image and confirm the card presentation looks correct.
4. Review the article body, excerpt, SEO settings, and publish state.
5. Check the public blog page layout after publishing.

## Categories And Tags

Categories and tags should be managed intentionally. Prefer a stable taxonomy rather than creating near-duplicate terms.

Good practice:

- keep categories broad enough to support multiple posts
- use tags for more specific topics
- avoid multiple terms with the same meaning

## Featured Layouts

The CMS blog page can control how the featured article appears, how the grid below it behaves, and whether pagination or load more is used.

## Sidebar Behavior

The blog always uses a sidebar. That sidebar is managed through the Sidebars & Widgets system rather than hard-coded page content.

## Comments

Comments are controlled at the blog-settings level.

- Comments can be fully disabled sitewide.
- When guest comments are enabled, guests must provide a name and legitimate email address.
- Approval rules, link allowance, and spam-prevention settings should be reviewed before enabling comments publicly.
- Use the `Comments` tab to approve, hide, reject, or delete comments.
- Pending comments can appear as if submitted successfully to the commenter without being visible to everyone else until moderation approves them.

## Editing Safety

Blog post editors now participate in the shared editor-lock system.

- Only one admin or editor can actively edit a post at a time.
- Additional users will see the post in read-only mode until the lock is released or taken over by an admin.
