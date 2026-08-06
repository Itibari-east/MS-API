# Bug: UOM rows are missing `created_by` on create

Date: 2026-08-06

## Summary

The UOM API create flow succeeds, and the row is written to `itibari.commercials.uoms`, but the audit field `created_by` is not populated.

## Expected

After creating a UOM, the database row should contain:

- `creation_time`
- `created_by`
- `last_modified_by` on later updates or status changes

## Actual

- `creation_time` is present
- `created_by` is `null` / `undefined`
- `last_modified_by` cannot be validated on create because the creator field assertion fails first

## Impact

- The automated DB validation cannot confirm ownership metadata for new UOM records.
- Audit expectations are inconsistent with the current backend write behavior.

## Notes

- The database connection is working.
- The row lookup succeeds in `itibari.commercials.uoms`.
- The issue is data population, not query access or column naming.
