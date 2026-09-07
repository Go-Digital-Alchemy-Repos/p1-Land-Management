# Field offline behavior

An initial online login and assignment download are required. Download My Day stores assigned work in an account-specific IndexedDB database; field notes, checklist/time/completion events and photos use durable local stores. The service worker caches the application shell and discovered build assets, not API responses. Office approval, billing and payments require connectivity.

Sync Now sends photos and ordered operations while online. Only server acknowledgment removes a pending item. Operation IDs make retries safe; changed versions retain conflicts. The app does not rely on background sync. Reopen with connectivity and verify pending counts reach zero before sign-out. Sign-out is blocked with pending work; after successful sign-out, that account's cache is cleared.

Persistent-storage requests are best effort and do not guarantee mobile-browser retention. Physical iOS/Android testing, low-space behavior, browser eviction, interrupted uploads and offline reopened shell acceptance remain outstanding. Remote revocation cannot erase an offline device instantly. Production training must explain these limits, and users must not treat a closed app as proof of synchronization.

## Crew lifecycle follow-up (after initial preview)

A valid time.start event starts scheduled work without changing its downloaded assignment version. This deliberately lets subsequent checklist and completion events from that download synchronize in order. Completion still increments the version and enters manager review; office changes/cancellation still invalidate stale submissions. Starts on draft/delayed/closed work or with unmet prerequisites are retained as conflicts.

My Day selects a date in America/New_York and downloads that date's assignments. Storage readiness distinguishes granted persistence from browser-managed retention. Estimated free capacity is checked before captures, with a 2MiB reserve, but browser estimates are advisory. Actual write failure remains authoritative. Download replacement is refused if it would replace changed/missing assignments with pending events or omit jobs with queued photos; no pending item is deleted. These follow-ups are locally implemented and require browser/device acceptance before production promotion.

Browser regression evidence: `tests/offline-browser.html` is a development-only harness served by Vite and omitted from the production entry build. On 2026-09-07 the in-app browser executed 12 passing checks using real IndexedDB: persisted assignment/entry/photo data across database close/reopen, duplicate-ID protection, changed/missing-download rejection, retained original version, account queue isolation, acknowledgment cleanup and completed-account cache deletion. Only a disposable synthetic account was used and cleaned up. This does not prove OS-level restart, physical iPhone/Android eviction, low-space or network-interruption behavior.
