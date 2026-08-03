# User Management Test Run

Date: 2026-08-01
Command: `npx playwright test tests/usermanagement --reporter=line`

## Summary

- Total tests: 29
- Passed: 6
- Failed: 23
- Skipped: 0

## Passed

- `Reports > placeholder — no reports service implemented yet`
- `Location Management > Security > returns 401 when accessing location endpoints without a token`
- `Roles > Security > returns 401 when accessing role endpoints without a token`
- `User Management > Security > returns 401 when accessing user endpoints without a token`
- `User Management > Security > returns 401 with an invalid token format`
- `User Management > Security > returns 401 with an expired or tampered JWT`

## Failed

- `Location Management > manages countries, cities, branches and departments`
- `Location Management > Edge cases > returns 4xx when creating a country with duplicate code`
- `Location Management > Edge cases > returns 4xx when creating a city with a non-existent country`
- `Location Management > Edge cases > returns 4xx when creating a branch with a non-existent region`
- `Location Management > Edge cases > returns 404 when fetching a non-existent entity`
- `Location Management > Security > rejects XSS in string fields when creating a country`
- `Location Management > Security > rejects XSS in department name`
- `Location Management > Security > rejects SQL injection in branch name`
- `Permission Management > manages permission groups and permissions`
- `Rejection Codes > manages rejection codes`
- `Roles > creates roles, adds privileges, fetches and deletes them`
- `Roles > Edge cases > returns 4xx when fetching a non-existent role`
- `Roles > Edge cases > returns 4xx when adding privileges to a non-existent role`
- `Roles > Edge cases > creates a role with an empty privilege list`
- `Roles > Security > rejects SQL injection in string fields when creating a role`
- `User Management > creates, updates, fetches and deletes users`
- `User Management > lists users with pagination`
- `User Management > resets user password`
- `User Management > locks a user`
- `User Management > fetches current user and activity logs`
- `User Management > Edge cases > returns 4xx when creating a user with a duplicate email`
- `User Management > Edge cases > returns 404 when fetching a non-existent user`
- `User Management > Security > returns 404 or 400 when accessing random UUIDs`

## Notes

- The dominant failure mode was `401 Unauthorized` responses from the API for operations that the test helpers expected to succeed.
- A few edge-case tests also failed because the service returned `401` instead of the expected `400/404/422`.
- The suite did run against an existing bearer token from `auth/auth.json`, so these failures are from live API behavior rather than missing local test files.
