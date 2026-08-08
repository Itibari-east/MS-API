# Supplier API Coverage Report

Date: 2026-08-08

This note summarizes the current automated coverage for the Supplier module in
`tests/suppliers/supplier.spec.ts` and the reusable workflow helpers in
`helpers/supplierFactory.ts` and `services/supplier.ts`.

## Covered

- Create supplier draft
- Complete supplier onboarding flow
- Upsert contact information
- Upsert primary contact
- Upsert secondary contact
- Patch business terms
- Replace banking information
- Replace mobile money information
- Patch additional information
- Upsert document metadata
- Confirm supplier
- Get supplier detail
- List suppliers
- Search, pagination, and sorting
- Search by supplier name
- Search by supplier id
- Keep a supplier in draft when onboarding is incomplete
- Reject confirm before onboarding is complete
- Deactivate supplier
- Prevent duplicate deactivation
- Grant supplier portal access
- Prevent duplicate portal access grants
- Bulk deactivate suppliers
- List supplier activity events
- List supplier documents created during onboarding
- List supplier products
- Product summary endpoint
- List supplier rebates
- Rebate summary endpoint
- Performance summary endpoint
- Recent deliveries endpoint
- Reject unauthenticated requests
- Reject invalid supplier ids
- Reject malformed draft payloads

## Expected Failures

- Supplier detail metadata coverage for `created_by` / `createdBy`
  - This case is currently marked as an expected failure in the test suite
    because the backend omits the field on supplier detail responses.

## Missing Coverage

- Reactivate supplier
- Update/edit supplier after creation
- Duplicate detection for:
  - supplier name
  - primary phone number
  - primary email
  - registration number
  - TIN number
- Deactivation validation rules:
  - pending purchase orders
  - outstanding payments
  - active contracts
  - reason selection
  - notes / justification
- Supplier product mapping actions:
  - attach products to a supplier
  - unlink products from a supplier
  - bulk product upload
  - product export
- Document management actions:
  - document upload
  - renewal reminder
  - document view/download
  - document export
- Rebate management actions:
  - rebate agreement view
  - rebate export
- Performance tracking actions:
  - responsiveness metrics
  - quality gauges
  - order-status breakdown
  - lead-days trend
  - delivery-series trend
- Export functionality
- Draft expiry behavior
- Automatic notifications after registration
- Accounting-system side effects after registration
- UI-only behaviors such as:
  - column visibility
  - row selection
  - quick view
  - responsive list rendering

## Notes

- The current automation focuses on API workflow coverage rather than UI-only
  interactions.
- The onboarding helper intentionally reuses the same supplier record across
  the onboarding steps so tests stay readable and maintainable.
- The report should be updated as the Supplier API grows or when backend
  behavior changes.
