---
name: Converting EPS and DOCX assets without ghostscript/python
description: How to extract usable content from EPS logos and DOCX copy when the usual CLI tools are missing in the Replit container.
---

# Converting supplied EPS / DOCX assets in this environment

The base Replit container has `magick` (ImageMagick) and `node`/`unzip`, but typically
**no ghostscript and no python**. That breaks the obvious conversion paths.

## EPS → PNG (logos delivered as .eps)
- `magick file.eps out.png` fails without ghostscript (EPS rasterization needs gs).
- Illustrator/most EPS files embed a low-res TIFF preview. Extract that instead:
  read the EPS binary, find the TIFF preview offset/length from the EPS header
  (or carve the `II*\0` / `MM\0*` TIFF magic), write it out, then `magick preview.tiff out.png`.
- The resulting PNG inherits the preview's low resolution and can look slightly
  halftone/noisy. Good enough for header/footer logo sizes; don't expect crisp vector quality.
- `remove_image_background_tool` works on these PNGs to get a transparent logo, but the
  noise from the TIFF preview remains. Pass both transparent and solid-background versions
  to the design subagent and let it choose per background.

## DOCX → text (page copy delivered as .docx)
- No python-docx. Use node + unzip: `unzip -p file.docx word/document.xml`, then strip XML —
  split on `<w:p ` for paragraphs, pull text from `<w:t ...>...</w:t>` runs, convert `<w:tab/>`
  and `<w:br/>`, and unescape `&amp; &lt; &gt; &quot; &#39;`. Produces clean readable text.

**Why:** These came up converting client-supplied brand/content files for a marketing site;
the default tools everyone reaches for (gs, python-docx) aren't installed, so the fallbacks above
are the reliable path.
