# Field offline behavior

An initial online login and assignment download are required. Download My Day stores assigned work in an account-specific IndexedDB database; field notes, checklist/time/completion events and photos use durable local stores. The service worker caches the application shell and discovered build assets, not API responses. Office approval, billing and payments require connectivity.

Sync Now sends photos and ordered operations while online. Only server acknowledgment removes a pending item. Operation IDs make retries safe; changed versions retain conflicts. The app does not rely on background sync. Reopen with connectivity and verify pending counts reach zero before sign-out. Sign-out is blocked with pending work; after successful sign-out, that account's cache is cleared.

Persistent-storage requests are best effort and do not guarantee mobile-browser retention. Physical iOS/Android testing, low-space behavior, browser eviction, interrupted uploads and offline reopened shell acceptance remain outstanding. Remote revocation cannot erase an offline device instantly. Production training must explain these limits, and users must not treat a closed app as proof of synchronization.
