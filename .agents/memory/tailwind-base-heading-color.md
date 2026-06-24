---
name: Base-layer heading color overrides inherited text color
description: Why hero headings on dark sections render invisible unless given an explicit text color utility
---

In the p1-website (and any project that adds an `@layer base { h1,h2,...,h6 { ... text-secondary } }` rule in index.css), every heading element gets a dark color applied directly via element selector.

**The trap:** Putting a heading inside a dark `<section className="... text-white">` does NOT make the heading white. The section's `text-white` sets color on the section element; children normally inherit, BUT an element-targeted base rule (`h1 { color: ... }`) applies directly to the heading and beats inheritance. Result: white-on-dark heroes show a dark, nearly invisible headline while sibling `<p>` text (which has no element-level base color) inherits the white correctly.

**The fix:** Every heading on a dark background needs an explicit color utility (e.g. `text-white`) on the element itself, since a utility class overrides the base-layer element rule. Working heroes (home, blog) already had `text-white drop-shadow-md`; the broken service/service-area heroes omitted it.

**How to apply:** When placing any `h1`–`h6` on a non-default background, set the color explicitly on the heading, not just on an ancestor. Don't rely on inheritance from a parent `text-*` class.
