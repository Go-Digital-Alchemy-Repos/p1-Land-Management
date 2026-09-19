# Recurring visit date and time

The Recurring table displays Next Visit as `MM/DD/YYYY h:mmam/pm`, using the existing `America/New_York` scheduling timezone. Missing or invalid dates display an em dash. Stored timestamps and scheduling behavior are unchanged. For example, `2026-09-19T12:00:00.000Z` displays as `09/19/2026 8:00am`.

Validation covers UTC date boundaries, daylight saving time, empty values, and the supplied example, alongside dashboard type checking and production build.
