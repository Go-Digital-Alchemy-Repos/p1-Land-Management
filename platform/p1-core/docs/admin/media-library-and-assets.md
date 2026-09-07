# Media Library And Assets

The media library is the shared asset source for images and supported business documents used throughout the site and CMS.

## What The Media Library Stores

- page images
- hero images
- block background images
- blog thumbnails
- event thumbnails
- documents such as PDFs and common office files

## Storage Model

Uploaded assets are stored in Cloudflare R2. The CMS keeps metadata so assets can be searched, reused, and tracked across the site.

## Recommended Workflow

1. Upload the asset into the media library first when possible.
2. Add title and alt text immediately.
3. Use captions or descriptions when the asset needs editorial context.
4. Reuse the existing asset from the picker instead of uploading duplicates.

## Usage Tracking

The media library now distinguishes between assets in use and assets not in use. Before deleting a file, check where it is referenced so you do not break a page, post, or section.

## Accessibility Rules

- Add meaningful alt text for informational images.
- Use empty or minimal alt text only when an image is purely decorative.
- Keep filenames readable when possible so reused assets remain easy to identify.

## Documents

Documents can be uploaded and referenced across the site. Use clear titles and descriptions so editors can distinguish download assets from images.
