# Static Google reviews fallback

Verified September 21, 2026 against P1 Land Management's public Google Business
Profile. Google reported a 5.0 average across six reviews and exposed five written
five-star reviews in the review interface. The homepage preserves those five
written reviews verbatim, with author attribution, a Google profile link and the
verified aggregate count. No owner-response text is reproduced.

The static records are the initial state of `GoogleReviewShowcase`. The existing
server-side Business Profile integration remains the source of truth once Google
enables API access: a valid, non-empty API response replaces the static records
without changing the component or page layout. Failed, unavailable or empty API
responses leave the verified static reviews visible instead of hiding the section.

Validation completed on the isolated release branch:

- website TypeScript check passed;
- 54-route build, prerender and CMS manifest generation passed;
- responsive-image and location-page projections passed;
- the public-content regression check passed, including ten homepage service cards
  and four Why P1 advantages;
- local browser review confirmed the 5.0/six-review summary, all five written
  reviews, Google links and full untruncated review text.

The static verification date and aggregate are intentionally visible. Refresh the
fallback before another release if API access is still unavailable and the Google
profile changes.
