# Bug: Privilege names cannot be reused across different permission groups

Date: 2026-08-03

## Summary

Creating the same privilege names under two different permission groups should work, but the UI currently fails with `500`.

## Expected

The following flow should succeed:

1. Create permission group A
2. Create privileges `Create` and `Update` in group A
3. Create permission group B
4. Create privileges `Create` and `Update` in group B

Privilege names should be valid within their own permission group, even if the same names exist in another group.

## Actual

- The UI fails with `500` when trying to create the second set of privileges.
- API automation currently shows the request succeeding with `200`, which suggests the UI and API behavior are not aligned or the UI is hitting a different validation path.

## Impact

- Users cannot set up equivalent privilege sets across separate permission groups.
- This blocks a normal permission-management workflow and makes group-based privilege reuse unreliable.

## Notes

- This should be treated as a positive validation case, not a negative one.
- The current test that expects reusing privilege names across different permission groups to fail should be updated once the product behavior is confirmed.
