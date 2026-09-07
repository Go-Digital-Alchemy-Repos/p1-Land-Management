# Standalone locations

Store Locator creation creates a directory profile with a required location name (`title`), `directory_mode = store_locator`, and a null `user_id`. It does not create a user, hash a password, or send an account approval email. Account fields are omitted from the location form. Service Provider Directory creation retains its existing account flow.

Migration `0061_standalone_locations` makes `therapist_profiles.user_id` nullable while retaining its foreign key for linked accounts. Existing profiles and users remain unchanged. Directory queries use left joins and continue excluding suspended linked users. For standalone records, the location title supplies the display name and account-only editing controls are hidden; profile gallery media remains supported.

Local integration verification: migrate a disposable PostgreSQL database, then run `DATABASE_URL=... npx tsx server/tests/standalone-locations.integration.ts`. The script checks name validation, creation without credentials, an unchanged user count, detail lookup, listings, and filters. It requires a localhost database and creates two test locations.

Rollback: reverting application code alone would hide standalone records because the old queries require users. Restore compatible location reads before rolling back UI changes. Do not restore the NOT NULL constraint while standalone records exist, and do not delete locations or create placeholder users to satisfy it.
