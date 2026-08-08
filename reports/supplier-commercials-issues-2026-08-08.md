# Supplier and Commercials Issues

Date: 2026-08-08

This note consolidates the current issues surfaced by the automated
`tests/suppliers/*` and `tests/commercials/*` suites.

## Supplier Module

### Confirmed backend issue

- Supplier detail metadata does not reliably return a populated creator field.
  - Current automation still sees `createdBy` / `created_by` as missing or null
    on detail responses.
  - This is already tracked as an expected failure in the supplier coverage
    notes.

### Missing coverage

- Reactivate supplier
- Update/edit supplier after creation
- Duplicate detection for:
  - supplier name
  - primary phone number
  - primary email
  - registration number
  - TIN number
- Deactivation rules for:
  - pending purchase orders
  - outstanding payments
  - active contracts
  - reason selection
  - notes / justification
- Product assignment and removal
- Bulk product upload
- Product export
- Document upload / download / view / export
- Rebate agreement view and export
- Performance metrics beyond the current summary endpoints
- Draft expiry behavior
- Automatic notifications after registration
- Accounting side effects after registration

## Commercials Service

### Product hierarchy issues

- Duplicate class name within the same category is currently allowed.
- Duplicate subclass name within the same class is currently allowed.
- Creating a class under an inactive category is currently allowed.

### UOM issue

- UOM database validation reaches the row in `itibari.commercials.uoms`, but the
  creator audit field is not populated.
  - `creation_time` is present
  - `created_by` is missing or null
  - `last_modified_by` is not yet verifiable on the create path because the
    creator field gap is already present

### Package unit gaps

The package unit suite is green, but the API still has untested or partially
tested gaps:

- code validation boundaries
- name validation boundaries
- description length boundaries
- invalid or inactive base UOM handling
- conversion factor edge cases
- invalid status handling
- 403 / role-based forbidden coverage
- invalid bearer token coverage
- empty result list behavior
- malformed sort parameter behavior

### Not yet covered in automation

- Delete and reactivate flows for categories, classes, and subclasses
- Image upload and dimension checks
- Display order management
- Export endpoints
- Dependency flows when hierarchy nodes are used by products
- Package-to-package nested relationships, if supported by the backend

## Notes

- The supplier suite is mostly green, with the creator-field issue remaining the
  primary backend gap.
- The commercials hierarchy suite is green in its current automation scope, but
  the backend still allows several duplicate and inactive-parent scenarios.
- The package unit suite is green, and the remaining items above are coverage
  gaps rather than failing assertions.
