import { type HTMLAttributes, type MouseEvent, useMemo } from "react";
import { cn } from "@/lib/utils";
import { markdownToHtml, type MarkdownToHtmlOptions } from "@/lib/markdown";

type MarkdownDocumentProps = HTMLAttributes<HTMLDivElement> & {
  content: string;
  resolveLink?: MarkdownToHtmlOptions["resolveLink"];
  onDocLinkClick?: (slug: string) => void;
};

export function MarkdownDocument({
  content,
  className,
  resolveLink,
  onDocLinkClick,
  onClick,
  ...props
}: MarkdownDocumentProps) {
  const html = useMemo(() => markdownToHtml(content, { resolveLink }), [content, resolveLink]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const target =
      event.target instanceof Element ? event.target.closest("a[data-doc-slug]") : null;
    const slug = target?.getAttribute("data-doc-slug");
    if (!slug) {
      return;
    }

    event.preventDefault();
    onDocLinkClick?.(slug);
  };

  return (
    <div
      {...props}
      className={cn("prose prose-sm max-w-none", className)}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
