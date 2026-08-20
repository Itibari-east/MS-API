# Products Coverage Note

This note summarizes the current automated coverage for the Commercials `Products` API and highlights the SRS items that still need backend or API support.

## Automated Coverage

- Create a product and keep it pending approval
- View a created product
- Update product details while preserving immutable fields
- Change product status between active and inactive
- Toggle best-seller flag
- Search products by name
- Search products by barcode
- Search products by SKU
- Filter products by category, status, pagination, and sort order
- List pending approval items
- Delete a pending product before approval
- Export products
- Reject malformed create payloads
- Reject write operations for unknown product ids
- Reject requests without authentication

## SRS Gaps That Still Need Attention

These are not yet fully covered by the API automation because the backend does not currently expose enough surface area, or the behavior is primarily UI-driven:

- Product image upload, replace, delete, primary image selection, and gallery management
- Thumbnail/preview behaviors and zoom/download actions
- Advanced filter options not exposed in the current API contract:
  - supplier filter
  - stock status filter
  - price range filter
  - stock range filter
  - filter presets
- Bulk activate/deactivate endpoints for selected products
- Product approval queue actions for update, deactivation, and reactivation workflows
- Approval rejection reason codes and approval comments flow
- Reactivation workflow for inactive products
- Deactivation pre-check rules:
  - active orders
  - stock on hand
  - recent sales
- SRS delete-before-approval behavior
  - the backend currently requires a product to be inactive before deletion
  - the SRS says pending products can be deleted before approval
- Pending product status workflow
  - the backend currently blocks inactive transitions for pending products until approval
  - if the intended production flow allows direct cleanup of pending products, the API needs to support that contract explicitly
- Product detail tabs that depend on other modules or UI-only data:
  - images
  - price history
  - stock graphs
  - sales data
  - activity log
- SRS SKU format expectation:
  - `SKU-YYYYMMDD-XXXX`
  - current API responses do not yet match that format consistently
- Product name uniqueness warning within category
- Barcode uniqueness enforcement
  - the SRS expects barcodes to be unique, but the backend currently accepts duplicate barcode values during create
- Product creation/edit warnings for selling price <= buying price
- Notification badges, dashboard widgets, and other UI-only presentation rules

## Dev Follow-Up

- Align SKU generation with the documented SRS format.
- Expose or confirm endpoints for image upload, approval workflows, bulk actions, and advanced filters.
- Confirm whether export should support Excel, PDF, and CSV as separate outputs.
- Expose reactivation and deactivation approval flows if they are expected in production.
