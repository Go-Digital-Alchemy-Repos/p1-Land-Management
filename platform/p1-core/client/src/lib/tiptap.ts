import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

const DEFAULT_LINK_CLASS = "text-primary underline cursor-pointer";
const CMS_LINK_CLASS = "text-primary underline underline-offset-2";

export function createStarterKit(options?: Parameters<typeof StarterKit.configure>[0]) {
  return StarterKit.configure({
    link: false,
    underline: false,
    ...options,
  });
}

export function createLinkExtension(className = DEFAULT_LINK_CLASS) {
  return Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: className,
    },
  });
}

export function createCmsLinkExtension() {
  return createLinkExtension(CMS_LINK_CLASS);
}
