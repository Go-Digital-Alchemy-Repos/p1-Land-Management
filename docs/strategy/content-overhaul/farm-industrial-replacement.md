# Owner-Supplied Farm Maintenance Image

Replaced only the framed supporting image on Industrial & Agricultural with the Owner-supplied `farm_industrial.png`. Preserved the original in `src/assets/features/farm-industrial-maintenance.png`; the page serves responsive WebP files through the existing image pipeline. The hero stays unchanged.

Original: 1672×941, 3,242,417 bytes. WebP quality 78: 480px 38,680 bytes; 768px 94,720 bytes; 1280px 246,170 bytes. Main delivery asset is 92.4% smaller than the supplied PNG. Compression also resizes to the site's delivery dimensions. All versions preserve the source composition; the existing 4:3 CSS frame crops the sides on display.

Validation: inspected compressed image and rendered framed crop; equipment, pond and drainage work remain visible. All 54 public routes pass SSR/CMS/metadata/link/FAQ QA; all 81 managed images pass budgets. Public/Core manifests regenerated together. No changes to body copy, forms, or other image consumers.
