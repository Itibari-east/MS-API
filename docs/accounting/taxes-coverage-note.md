# Accounting Taxes Coverage Note

This note summarizes the current automated coverage for the Accounting `Taxes` API and highlights the setup points that still need confirmation or backend support.

## Automated Coverage

- List tax code kinds
- View tax code lists
- Verify pagination and sort behavior on tax code lists
- Update a mutable tax code and restore it back to its original value
- Validate duplicate-create handling for an already seeded tax kind
- Reject malformed payloads
- Reject requests without authentication
- Reject invalid tax code ids

## Pending / Needs Confirmation

These items are not yet fully covered because the backend contract or SRS rules still need confirmation:

- Fresh create/delete lifecycle for tax codes in a non-seeded environment
- Search and applicable-to filtering on list endpoints is not yet behaving as expected
- Uniqueness rules for tax code name and code value
- Whether tax codes can be updated after they are used by products or suppliers
- Whether deletion should be blocked once a tax code is in use
- Whether tax code creation should support additional applicability scopes beyond `PRODUCT` and `SUPPLIER`
- Whether rate mutation should be allowed for all tax codes or only selected kinds
- Any SRS-specific validation messages for invalid values, duplicate names, or missing fields

## Dev Follow-Up

- Confirm the exact tax setup rules from the SRS or Postman collection.
- Expose any missing validation responses needed for negative tests.
- Confirm whether tax codes should have lifecycle restrictions once referenced by downstream records.
- Provide a resettable or dedicated seed-less tax environment if create/delete lifecycle coverage is required in automation.
