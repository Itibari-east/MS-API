# Commercials Product Hierarchy Automation

Date: 2026-08-08

## Automated

| Entity | Endpoint coverage | Status |
| --- | --- | --- |
| Category | create, get, list, update, status | Automated |
| Class | create, get, list, update, status | Automated |
| Sub-Class | create, get, list, update, status | Automated |
| Full hierarchy | category -> class -> sub-class lifecycle | Automated |

## Covered validations

- Missing authentication
- Invalid IDs
- Malformed payloads
- Category to class relationship checks
- Category to class to sub-class relationship checks
- Search, filter, pagination, and sorting paths exposed by the collection

## Confirmed product gaps

| Scenario | Observation |
| --- | --- |
| Duplicate class name within the same category | Backend currently allows it |
| Duplicate subclass name within the same class | Backend currently allows it |
| Create class under inactive category | Backend currently allows it |

## Not exposed in the current API collection

The bundled commercials Postman collection exposes only these hierarchy operations:

- Category: list, create, get detail, edit, status
- Class: list, create, get detail, edit, status
- Sub-Class: list, create, get detail, edit, status

The following doc items were not automated because they are not exposed by the current API contract:

- Category image upload and dimension validation
- Display order management
- Export endpoints
- Delete endpoints
- Reactivation endpoints
- Product dependency flows for category/class/sub-class movement
- Class parent change and Sub-Class parent move with product dependencies

## Notes

- The hierarchy suite was verified successfully with `--workers=1` to avoid transient network-related request failures seen under parallel execution.
