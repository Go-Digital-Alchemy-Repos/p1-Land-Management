# Profile photo crop

Profile image selection and drag/drop now open a local crop editor before uploading. A circular preview uses the same source-square calculation as canvas export. Users can zoom 1–4×, drag the image, use labeled horizontal/vertical sliders with keyboard controls, reset or cancel. The current avatar remains unchanged until Save photo succeeds. Failed uploads retain the crop for retry; duplicate save clicks are guarded.

Output is at most 512×512, encoded WebP at quality .92 (browser fallback MIME is retained), and sent through the existing authenticated profile-avatar endpoint. The server still validates/re-encodes the image and owns storage/access controls. No new dependency, provider, schema or permissions. Sources remain local until confirmation; blob URLs are released on close/replacement. Existing 5 MiB JPEG/PNG/WebP selection limits remain, with a 16 MP decoded-image guard matching the server's existing limit.

Design reference: Owner-approved Refero exports in `docs/design/refero-dashboard`, existing profile card, neutral controls and circular avatar presentation. No change to colorful icons or public website.

Validation: four focused tests cover source boundaries for landscape/portrait/zoom, cancel without upload, export rectangle/format and failed-upload retention. Dashboard type check and build pass. Local browser preview verified zoom control updates before release, without changing a production avatar. Rollback is a scoped UI commit revert; persisted avatars require no migration.
