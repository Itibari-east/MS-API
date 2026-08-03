# Failed Scenarios - 2026-08-03

Latest Playwright user-management run:
- 35 passed
- 4 skipped
- 4 failed

Verified on the happy path:
- GET responses for countries, cities, branches, departments, roles, permission groups, privileges, and users return an audit field named `createdBy`.
- The suite does not currently assert `created_by`; the backend is using camelCase in the payloads.
- After tightening the assertion, the creator field is not usable for the happy-path GET checks; the responses are missing it or returning it as null.

## Locations

1. `Location Management > blocks deleting a country with active cities`
   - Expected a delete block status.
   - Actual status: `204`.
   - Outcome: country deletion is currently allowed even when cities exist.

2. `Location Management > blocks deleting a city with active branches`
   - Expected a delete block status.
   - Actual status: `204`.
   - Outcome: city deletion is currently allowed even when branches exist.

3. `Location Management > blocks deleting a branch with active users`
   - Expected a delete block status.
   - Actual status: `204`.
   - Outcome: branch deletion is currently allowed even when users exist.

## Permissions

4. `Permission Management > rejects reusing privilege names in different permission groups`
   - The test failed while creating the privilege set.
   - Actual status during privilege creation: `200`.
   - Outcome: the backend currently allows the same privilege names to be reused across groups, so the negative case is not blocked.

## Audit Field Gap

The stricter GET assertions for create/update flows now fail because the entity payloads do not provide a non-null creator value. This currently affects:
- locations create/update
- permission groups create/update
- roles create/update
- users create/update
