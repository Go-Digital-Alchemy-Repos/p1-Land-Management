# P1 Equipment Image Guidelines

Owner-confirmed direction — September 17, 2026.

- Commercial mowers: orange, resembling current Kubota commercial mower models.
- Skid steers, compact track loaders, excavators, and other large equipment: yellow CAT or orange Kubota, resembling current models from the respective manufacturer.
- Match the machine type, size, attachment, and working position to the job shown. Use manufacturer references when generating or revising equipment imagery; do not merely recolor an unrelated machine.
- Keep images photorealistic, with believable equipment proportions and functional attachments.
- Do not imply ownership of a particular model unless the Owner confirms it. Brand ownership is confirmed for CAT and Kubota.
- Retain the supplied farm-industrial image with yellow CAT equipment; yellow heavy equipment is consistent with this direction.
- Optimize website images into responsive WebP variants using the existing image pipeline.

This clarification expands the heavy-equipment options. The orange Kubota mower requirement still applies.

## Service Hero and Grid Consistency

Service detail pages, the homepage/services grids, and the service gallery share canonical image exports in `artifacts/p1-website/src/lib/service-images.ts`. Replace a service hero there, not through a separate page-only asset import. Keep card titles and crops appropriate to the replacement image. Regenerate both CMS manifests after changes and check published CMS overrides for independently selected images before release.
