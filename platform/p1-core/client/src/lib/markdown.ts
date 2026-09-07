function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }

  return null;
}

export type MarkdownHeading = {
  id: string;
  level: number;
  text: string;
};

export type MarkdownLinkResolution = {
  href: string;
  docSlug?: string;
};

export type MarkdownToHtmlOptions = {
  resolveLink?: (href: string) => MarkdownLinkResolution | null;
};

export function slugifyMarkdownHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const usedIds = new Map<string, number>();

  return markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line) => {
      const match = line.trim().match(/^(#{1,6})\s+(.+)$/);
      if (!match) {
        return [];
      }

      const baseId = slugifyMarkdownHeading(match[2]) || "section";
      const count = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, count + 1);

      return [
        {
          id: count === 0 ? baseId : `${baseId}-${count + 1}`,
          level: match[1].length,
          text: match[2].replace(/[`*_]/g, "").trim(),
        },
      ];
    });
}

export function docSlugFromMarkdownPath(href: string) {
  const withoutHash = href.split("#")[0];
  const trimmed = withoutHash.trim();

  if (!trimmed || /^(https?:|mailto:|tel:|#|\/)/i.test(trimmed) || !trimmed.endsWith(".md")) {
    return null;
  }

  return trimmed
    .replace(/^\.?\//, "")
    .replace(/^\.\.\//, "")
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function applyInlineMarkdown(value: string, options: MarkdownToHtmlOptions = {}) {
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, (_match, code) => `<code>${code}</code>`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const resolved = options.resolveLink?.(url);
    const safeUrl = resolved?.href ?? normalizeUrl(url);
    if (!safeUrl) {
      return label;
    }

    const external = /^https?:/i.test(safeUrl);
    const docSlug = resolved?.docSlug
      ? ` data-doc-slug="${escapeAttribute(resolved.docSlug)}"`
      : "";
    return `<a href="${escapeAttribute(safeUrl)}"${docSlug}${external ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");

  return html;
}

function isMarkdownTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function markdownToHtml(markdown: string, options: MarkdownToHtmlOptions = {}) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const headings = extractMarkdownHeadings(markdown);
  let headingIndex = 0;

  let paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let codeFence = false;
  let codeLines: string[] = [];

  const closeParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    html.push(`<p>${applyInlineMarkdown(paragraphLines.join(" "), options)}</p>`);
    paragraphLines = [];
  };

  const closeList = () => {
    if (!listType) {
      return;
    }

    html.push(`</${listType}>`);
    listType = null;
  };

  const closeCodeFence = () => {
    if (!codeFence) {
      return;
    }

    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeFence = false;
    codeLines = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trim();

    if (codeFence) {
      if (trimmed.startsWith("```")) {
        closeCodeFence();
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    if (trimmed.startsWith("```")) {
      closeParagraph();
      closeList();
      codeFence = true;
      codeLines = [];
      continue;
    }

    const nextLine = lines[lineIndex + 1];
    if (trimmed.includes("|") && nextLine && isMarkdownTableSeparator(nextLine)) {
      closeParagraph();
      closeList();
      const headers = parseMarkdownTableRow(trimmed);
      const rows: string[][] = [];
      let rowIndex = lineIndex + 2;

      while (
        rowIndex < lines.length &&
        lines[rowIndex].trim().includes("|") &&
        lines[rowIndex].trim()
      ) {
        rows.push(parseMarkdownTableRow(lines[rowIndex]));
        rowIndex += 1;
      }

      html.push("<table>");
      html.push(
        `<thead><tr>${headers.map((header) => `<th>${applyInlineMarkdown(header, options)}</th>`).join("")}</tr></thead>`,
      );
      html.push(
        `<tbody>${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${applyInlineMarkdown(cell, options)}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody>`,
      );
      html.push("</table>");
      lineIndex = rowIndex - 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeParagraph();
      closeList();
      const level = headingMatch[1].length;
      const id = headings[headingIndex]?.id ?? slugifyMarkdownHeading(headingMatch[2]);
      headingIndex += 1;
      html.push(
        `<h${level} id="${escapeAttribute(id)}">${applyInlineMarkdown(headingMatch[2], options)}</h${level}>`,
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      closeParagraph();
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${applyInlineMarkdown(orderedMatch[1], options)}</li>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      closeParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${applyInlineMarkdown(unorderedMatch[1], options)}</li>`);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeParagraph();
      closeList();
      html.push(`<blockquote><p>${applyInlineMarkdown(quoteMatch[1], options)}</p></blockquote>`);
      continue;
    }

    paragraphLines.push(trimmed);
  }

  closeParagraph();
  closeList();
  closeCodeFence();

  return html.join("\n");
}

export function markdownToExcerpt(markdown: string, maxLength = 140) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[#>*_\-[]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}
