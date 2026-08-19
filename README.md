# MS--API

Playwright + TypeScript API automation framework for the MS API suite.

## What lives where

- `tests/` - API test scenarios grouped by module.
- `services/` - reusable API clients and business workflows.
- `requests/` - raw endpoint mappings.
- `helpers/` - fixtures, shared test helpers, and global setup wiring.
- `pos/` - POS-specific request, service, and fixture helpers.
- `config/` - environment-specific base URLs and auth defaults.
- `auth/` - generated auth state and login helpers.
- `utils/` - shared utilities such as data builders, database, and formatter helpers.
- `constants/` - shared endpoint and test data constants.
- `scripts/` - Playwright report formatting and matrix helpers.
- `reports/` - reference notes and exported collections used for review.

## Prerequisites

- Node.js installed
- npm installed
- access to the MS API environment you want to run against
- either a valid MFA setup or a bearer token for authenticated runs

## Install

```bash
npm install
```

## Authentication

The test suite uses global setup in [auth/globalSetup.ts](./auth/globalSetup.ts).

It will:

- reuse `auth/auth.json` if it already contains a valid token
- use `MS_WEB_BEARER_TOKEN` if it is set
- otherwise generate a token with `MS_TOTP_SECRET`
- skip authenticated setup if no usable token source is available

Common environment variables:

- `ENVIRONMENT` - `DEV` or `PRODUCTION`
- `MS_USER_EMAIL`
- `MS_USER_PASSWORD`
- `MS_TOTP_SECRET`
- `MS_WEB_BEARER_TOKEN`
- `MS_DEV_BASE_URL`
- `MS_PROD_BASE_URL`
- `MS_POS_BASE_URL`
- `POS_ADMIN_USERNAME`
- `POS_ADMIN_PASSWORD`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_TEST_EMAIL`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_ACCESS_TOKEN`

For normal local development, `ENVIRONMENT=DEV` is the default.

## Local test runs

Run the full suite:

```bash
npm run test:api
```

Run with the HTML report:

```bash
npm run test:api:headed-report
```

Run against production configuration:

```bash
ENVIRONMENT=PRODUCTION npx playwright test
```

Run a specific file:

```bash
npx playwright test tests/accounting/banks.spec.ts
```

Run a specific module by tag:

```bash
npx playwright test --grep "@accounting"
npx playwright test --grep "@supplier"
npx playwright test --grep "@inventory"
npx playwright test --grep "@document"
npx playwright test --grep "@pos"
```

Run specific tests by title text:

```bash
npx playwright test --grep "creates, gets, updates, lists, and deletes a document rule"
npx playwright test --grep "filters banks by search"
```

Run a focused slice with both module scope and title filtering:

```bash
npx playwright test tests/document/document.spec.ts --grep "file upload"
```

If you already have a bearer token, you can bypass MFA setup:

```bash
MS_WEB_BEARER_TOKEN=YOUR_TOKEN npx playwright test
```

## Playwright reporting

- Local HTML report: generated automatically when you run `npm run test:api:headed-report`.
- JSON/blob reports: generated in CI and merged by the workflow jobs.
- Slack summary formatting: handled by [scripts/format-playwright-report.cjs](./scripts/format-playwright-report.cjs).

## GitHub Actions

The repository has one workflow per module plus a full run workflow:

- [.github/workflows/auth-tests.yaml](./.github/workflows/auth-tests.yaml)
- [.github/workflows/accounting-tests.yaml](./.github/workflows/accounting-tests.yaml)
- [.github/workflows/commercials-tests.yaml](./.github/workflows/commercials-tests.yaml)
- [.github/workflows/document-tests.yaml](./.github/workflows/document-tests.yaml)
- [.github/workflows/inventory-tests.yaml](./.github/workflows/inventory-tests.yaml)
- [.github/workflows/pos-tests.yaml](./.github/workflows/pos-tests.yaml)
- [.github/workflows/supplier-tests.yaml](./.github/workflows/supplier-tests.yaml)
- [.github/workflows/usermanagement-tests.yaml](./.github/workflows/usermanagement-tests.yaml)
- [.github/workflows/full-run-tests.yaml](./.github/workflows/full-run-tests.yaml)

### Manual workflow runs

Each module workflow supports:

- `environment` - `DEV` or `PRODUCTION`
- `grep` - optional Playwright grep regex

That means you can run:

- a whole module with its tag, for example `@accounting`
- a subset of tests by title, for example `banks` or `creates a bank`
- a combination of module + specific tests using `grep`

The reusable workflow prefers the custom `grep` filter when it is supplied. If no `grep` is provided, it falls back to the module tag.

### Full run behavior

The full run workflow:

- runs all module shards
- merges the blob reports
- publishes the Slack summary on `push` to `main` and on the hourly schedule
- still runs tests on pull requests, but does not post Slack updates there

The hourly schedule is configured on the full run workflow with a cron of `0 * * * *`.

That keeps PRs quiet while preserving the main-branch release summary.

## Useful notes

- Tags such as `@auth`, `@accounting`, `@commercials`, `@document`, `@inventory`, `@supplier`, and `@usermanagement` are used to target module runs.
- Tags such as `@pos` target the POS auth service suite.
- The test suite is built around reusable services and helpers, so the same endpoint can be exercised from local runs, GitHub Actions, and Slack-reported CI runs.
- If a run needs authenticated setup, make sure the auth variables are present before launching Playwright.
