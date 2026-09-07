import type { BlockInstance } from "@/features/admin/cms/builder/block-registry";

export type CmsPageQualitySeverity = "error" | "warning" | "info";
export type CmsPageQualityTab = "builder" | "settings" | "seo";

export interface CmsPageQualityIssue {
  id: string;
  severity: CmsPageQualitySeverity;
  title: string;
  description: string;
  tab: CmsPageQualityTab;
}

export interface AnalyzeCmsPageQualityInput {
  title: string;
  slug: string;
  status: string;
  template: string;
  sidebarId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  noindex?: boolean;
  blocks: BlockInstance[];
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function isRichTextBlank(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const stripped = value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length === 0;
}

function addIssue(issues: CmsPageQualityIssue[], issue: CmsPageQualityIssue) {
  issues.push(issue);
}

export function analyzeCmsPageQuality(input: AnalyzeCmsPageQualityInput): CmsPageQualityIssue[] {
  const issues: CmsPageQualityIssue[] = [];

  if (isBlank(input.title)) {
    addIssue(issues, {
      id: "missing-title",
      severity: "error",
      title: "Page title is missing",
      description: "Add a title so editors and search engines can identify this page clearly.",
      tab: "settings",
    });
  }

  if (isBlank(input.slug)) {
    addIssue(issues, {
      id: "missing-slug",
      severity: "error",
      title: "Slug is missing",
      description: "This page needs a URL slug before it can be previewed and published safely.",
      tab: "settings",
    });
  }

  if (input.blocks.length === 0) {
    addIssue(issues, {
      id: "no-content-blocks",
      severity: "error",
      title: "No page sections yet",
      description:
        "Add at least one block section in the builder so this page has visible content.",
      tab: "builder",
    });
  }

  if (input.template === "with-sidebar" && !input.sidebarId) {
    addIssue(issues, {
      id: "missing-sidebar",
      severity: "warning",
      title: "Sidebar layout has no sidebar assigned",
      description:
        "Choose a sidebar in Page Settings so the sidebar template does not render empty.",
      tab: "settings",
    });
  }

  if (isBlank(input.seoTitle)) {
    addIssue(issues, {
      id: "missing-seo-title",
      severity: "warning",
      title: "SEO title is missing",
      description: "Add a custom SEO title to improve search and social previews.",
      tab: "seo",
    });
  }

  if (isBlank(input.seoDescription)) {
    addIssue(issues, {
      id: "missing-seo-description",
      severity: "warning",
      title: "SEO description is missing",
      description:
        "Add a meta description so search previews and social cards have meaningful summary text.",
      tab: "seo",
    });
  }

  if (isBlank(input.ogImageUrl)) {
    addIssue(issues, {
      id: "missing-og-image",
      severity: "warning",
      title: "Open Graph image is missing",
      description:
        "Add a social sharing image so this page looks polished when linked on social or in messages.",
      tab: "seo",
    });
  }

  if (input.noindex && input.status === "published") {
    addIssue(issues, {
      id: "published-noindex",
      severity: "info",
      title: "Published page is marked noindex",
      description:
        "That may be intentional, but this page will ask search engines not to index it.",
      tab: "seo",
    });
  }

  let h1Count = 0;

  input.blocks.forEach((block, index) => {
    const prefix = `block-${index}`;
    const props = block.props ?? {};
    const blockLabel = block.type.replace(/-/g, " ");

    if (block.type === "hero" && !isBlank(props.heading)) {
      h1Count += 1;
    }

    if (props.headingLevel === "h1" || props.sectionHeadingLevel === "h1") {
      h1Count += 1;
    }

    if (block.type === "hero" && isBlank(props.heading)) {
      addIssue(issues, {
        id: `${prefix}-hero-heading`,
        severity: "warning",
        title: "Hero section has no heading",
        description: "Add a headline so the page opens with a clear message.",
        tab: "builder",
      });
    }

    if (block.type === "rich-text" && isRichTextBlank(props.content)) {
      addIssue(issues, {
        id: `${prefix}-richtext-empty`,
        severity: "warning",
        title: "Rich Text block is empty",
        description: "Remove the block or add content so the page does not carry empty space.",
        tab: "builder",
      });
    }

    if (block.type === "video-embed" && isBlank(props.url)) {
      addIssue(issues, {
        id: `${prefix}-video-url`,
        severity: "warning",
        title: "Video block has no video URL",
        description: "Add a YouTube or Vimeo URL before publishing this block.",
        tab: "builder",
      });
    }

    if (block.type === "image-block" && !isBlank(props.imageUrl) && isBlank(props.alt)) {
      addIssue(issues, {
        id: `${prefix}-image-alt`,
        severity: "warning",
        title: "Image block is missing alt text",
        description: "Add descriptive alt text to improve accessibility and SEO.",
        tab: "builder",
      });
    }

    if (block.type === "text-image" && !isBlank(props.imageUrl) && isBlank(props.imageAlt)) {
      addIssue(issues, {
        id: `${prefix}-text-image-alt`,
        severity: "warning",
        title: "Text + Image block is missing alt text",
        description: "Add descriptive alt text for the image in this section.",
        tab: "builder",
      });
    }

    if (block.type === "cta" && (isBlank(props.primaryText) || isBlank(props.primaryLink))) {
      addIssue(issues, {
        id: `${prefix}-cta-primary`,
        severity: "warning",
        title: "CTA block is missing a primary action",
        description: "Make sure the primary button has both text and a destination link.",
        tab: "builder",
      });
    }

    if (block.type === "button-group" && Array.isArray(props.buttons)) {
      const hasInvalidButton = props.buttons.some(
        (button) =>
          isBlank((button as Record<string, unknown>).text) ||
          isBlank((button as Record<string, unknown>).link),
      );
      if (hasInvalidButton) {
        addIssue(issues, {
          id: `${prefix}-button-group`,
          severity: "warning",
          title: "Button Group has an incomplete button",
          description: "Each button should have both label text and a link destination.",
          tab: "builder",
        });
      }
    }

    if (Array.isArray(props.items) && props.items.length === 0) {
      addIssue(issues, {
        id: `${prefix}-empty-items`,
        severity: "info",
        title: `${blockLabel} section has no items`,
        description:
          "This section currently has an empty repeater list and may render with no meaningful content.",
        tab: "builder",
      });
    }

    if (block.type === "link-list" && Array.isArray(props.links)) {
      const hasPlaceholderLinks = props.links.some((item) => {
        const url = (item as Record<string, unknown>).url;
        return typeof url !== "string" || url.trim() === "" || url.trim() === "#";
      });
      if (hasPlaceholderLinks) {
        addIssue(issues, {
          id: `${prefix}-link-list-placeholder`,
          severity: "warning",
          title: "Link List contains placeholder links",
          description:
            "Replace placeholder URLs so editors do not accidentally publish dead links.",
          tab: "builder",
        });
      }
    }
  });

  if (h1Count === 0) {
    addIssue(issues, {
      id: "missing-h1",
      severity: "warning",
      title: "No primary H1 heading detected",
      description:
        "Make sure the page has one clear top-level heading for structure and SEO clarity.",
      tab: "builder",
    });
  } else if (h1Count > 1) {
    addIssue(issues, {
      id: "multiple-h1",
      severity: "info",
      title: "Multiple H1 headings detected",
      description:
        "That can be valid in some designs, but pages usually work best with one primary H1.",
      tab: "builder",
    });
  }

  return issues;
}
