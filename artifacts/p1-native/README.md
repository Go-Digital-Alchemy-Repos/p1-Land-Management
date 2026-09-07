# P1 native implementation

Accepted implementation slice: crew offline field capture, server-authorized staff reads, and online client published views. New app only; no native-specific authentication server or backend schema. Development identifiers are provisional and do not authorize store registration/distribution.

## Approved dependency envelope

Verified September 7, 2026 against the [official Expo compatibility table](https://docs.expo.dev/versions/latest/) and publisher `expo@57.0.20/bundledNativeModules.json`: Expo57.0.20, React Native0.86.3, React19.2.3, Node22.13+. iOS16.4+/Xcode26.4+, Android7+/API36. Exact compatible package versions are in package.json. Web React19.1 catalog remains unchanged. The native application is an isolated nested pnpm workspace with its own lockfile. Run the root frozen install first for linked shared contracts, then the native frozen install; the root workspace excludes this package to prevent native optional-peer pollution.

SQLCipher is enabled using the [Expo SQLite plugin](https://docs.expo.dev/versions/latest/sdk/sqlite/). Separate account/origin database keys and session credentials use [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). Keys are 256-bit random, device-only and available while unlocked. Database/photo BLOBs are encrypted; iOS private directory backup exclusion is installed at native launch, Android app backup disabled. Missing key plus existing database locks recovery; it never silently replaces the database. No client bulk offline cache is permitted.

No new MFA server plugin is installed. BetterAuth1.7.3's temporary signed two_factor challenge cookie stays in memory in the narrow auth adapter; business transport is bearer-only. Native response-header access, cookie omission and redirect refusal require actual iOS/Android proof before real credentials. In particular, JavaScript mock tests are not evidence that the OS networking implementation refuses credential-bearing redirects.

## Current validation and gates

Core transport/session/sync tests run with `node --experimental-transform-types --test tests/*.test.ts`. They cover late account responses, origin boundaries, pending-work logout protection, lost acknowledgments and invalid acknowledgment retention. SQLCipher native reopen/crash/low-space/key-loss tests remain required; these core tests do not validate device encryption.

Device gates remain open: MFA challenge/enrollment/recovery and token rotation; iOS/Android signed development builds; camera orientation/metadata and cache cleanup; airplane mode/process kill/reboot; low storage; backup restore/key invalidation; live role revocation and direct-ID access; accessibility/touch targets; controlled crew→manager→client pilot. Physical devices, signing credentials and distribution authority have not been supplied. Xcode currently selects CommandLineTools and no Xcode application was found in /Applications; this does not meet SDK57's Xcode26.4 requirement.

No production tokens, app workers, analytics SDKs, background-sync promise or store release are included.

## Development evidence

Android `assembleDebug` succeeded with Gradle9.3.1, Temurin17.0.20.1+1, API36, native SQLCipher and arm64-v8a. Official tooling is installed only under `~/.local/share/p1-native-tooling`; publisher checksums are recorded in `/tmp/p1-native-tooling.json`. SDK packages accepted their standard development licenses. This is a debug build using generated development signing, not store signing or release approval.

`node scripts/test-auth-protocol.mjs` creates a disposable PostgreSQL container and archives API revision49485adc464a6545aea54ab3a56f2fbdabdfa7fa. It exercises the actual native AuthProtocol against BetterAuth password/TOTP/recovery endpoints, expired/revoked sessions, mixed-cookie denial and failed token persistence. Only the test adapter rewrites its strict synthetic HTTPS origin to localhost and development cookie prefixes; production transport validation is unchanged. Rate limits stay enabled. No providers or real identities are involved.

Native networking explicitly imports `expo/fetch`. In installed Expo57.0.20, Android `NativeRequest.kt` disables cookie jar and both redirect modes for omit/error; iOS `ExpoURLSessionTask.swift` disables cookie handling and `NativeResponse.swift` denies redirects. React Native's legacy whatwg-fetch wrapper does not forward redirect policy, so it is not used by native adapters. Device checks must still verify these source-level expectations on each OS.

The development-only `EXPO_PUBLIC_P1_NATIVE_QA=1` entry runs synthetic encrypted-storage and native-network tests against an isolated emulator-loopback fixture. Release builds ignore this flag via `__DEV__`; production API transport remains HTTPS-only. It is not a customer onboarding or debug bypass route.

## September 7 native acceptance evidence

The Android API36 ARM64 emulator passed actual SQLCipher create/reopen, two scoped connections, retry deduplication, encrypted photo BLOB persistence, temporary photo removal after commit, missing-key lock and same-account key recovery. The initial exclusive-transaction implementation failed because Expo opened an unkeyed second connection; the vault now keys each transaction connection before BEGIN. These results do not establish crash recovery, disk-full behavior, physical camera correctness or iOS encryption.

The same emulator verified `expo/fetch` response Set-Cookie visibility, omitted cookies after populating the native cookie jar, and rejected redirects without any request reaching the redirect target. The real BetterAuth protocol harness separately passed password, TOTP and backup-code flows, session expiry, revocation and failed secure token persistence. Combining real authentication and native transport on physical devices remains a release gate.

An actual Application component scenario exercised crew A → owner MFA lock → cancel → crew B, with an injected SecureStore deletion failure. A's vault closed before cleanup, offline unlock stayed blocked, and B read/synced only B's resource. The scenario uses synthetic API/storage adapters; separate native storage tests establish SQLCipher behavior. Evidence files are `/tmp/p1-native-delete-failure-app.json`, `/tmp/p1-native-delete-failure-app.png`, `/tmp/p1-native-device-checks-final.json` and `/tmp/p1-native-device-checks-final.png`.

Offline restart metadata contains only a server-verified crew identity label, origin, timestamps and session-token fingerprint. It is valid no later than the actual verified session expiry, never renewed by offline reopening. Explicit offline access requires the same stored session and an existing encrypted downloaded snapshot. Known denial synchronously detaches views and transport, then records a nonsecret private-directory deny marker independently of SecureStore deletion. That marker blocks retained labels after a deletion failure; only fresh online identity/session verification can replace metadata and clear it. If both independent OS stores fail, the current process remains locked and reports failed durable revocation; persistence across process death under that combined failure is not established. No pending encrypted work is erased by forced locking.

Automated policy tests include malformed/noncanonical timestamps, multiday sessions, wrong origin/session, concurrent auth transitions and failed cleanup. Complete process-kill/offline-restart, encrypted backup restore, expiry/revocation on physical devices and accessibility checks remain required. This is an implemented development candidate, not an accepted production release.

## Reviewed follow-on fixes

`6999665` drains the initial field-operation queue in batches of100 rather than stopping after the first batch. Each response is validated before recording receipts; a partial response retains unconfirmed entries and stops, and any later request failure leaves subsequent batches unsent. Six sync tests cover201 entries, lost responses, conflicts, partial acknowledgments and a later-batch failure. Photo-upload isolation and per-item recovery remain separate work.

`a927c31` persists checklist changes and their immutable queued events in the same transaction. Reopening or re-downloading the same work revision retains local ticks; newer server versions are not overlaid. Root independently ran the actual vault against disposable SQLite with mocked Expo adapters, checking reopen, separate accounts, failed-write rollback and retry identity. This test does not establish SQLCipher device behavior.

The frozen `f12f752` application passed a bundled Android emulator restart rehearsal with Metro stopped and radios disabled. Exact saved note/photo bytes and another account's rows survived process death. Expired and known-revoked sessions stayed locked after restart; sync required fresh identity verification. Report: `/tmp/p1-native-offline-acceptance.json`; APK SHA256 `d2e111d5ce5dd5cefae408b7b4bb349d880d75077a98ca3631f05d96cf7c3e85`. Identity responses and photo bytes were synthetic, while Application, SecureStore and SQLCipher were real. Subsequent checklist/outbox changes need their own device checks; physical devices, iOS, low-space, backup and pilot acceptance remain open.

## Crew outbox

The crew-only saved outbox shows retained operation/photo IDs, work-order targets, capture times, pending/conflict states and bounded summaries for notes, issues, time, checklists and completion requests. It does not display raw JSON or load photo BLOBs. Pages contain at most 50 captures and use a deterministic capture-time/ID/type cursor; counts are queried separately. Refresh after queue changes. Conflicts remain protected for office review; no retry, deletion or resolution control is implied. Accepted captures leave local storage after acknowledgment, so this is retained local history rather than a complete server activity log.

Every page read requires the active origin/account vault binding. Offline validity is checked before and after reading, and account detachment clears the outbox immediately. `node scripts/test-outbox-storage.mjs` runs the actual vault against disposable SQLite with native key/cipher adapters mocked. It verifies 108 metadata records across three pages, conflicts, tied timestamps and IDs, cursor stability, account isolation and no BLOB queries or mutations. This test makes no native encryption claim.

Native account verification honors either the current per-user `mfaRequired` flag or its deprecated `ownerMfaRequired` compatibility alias. A required flag locks every affected role before loading business data; the verification screen uses account wording. This adapter does not choose which users require MFA or change the server's policy.
