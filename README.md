# MS--API

Playwright + TypeScript API automation framework for MS API tests.

## Structure

- `tests/` - API test scenarios by suite.
- `services/` - reusable business workflows.
- `requests/` - raw API request methods.
- `helpers/` - shared fixtures and schema helpers.
- `config/` - environment-specific configuration.
- `auth/` - global authentication setup and auth state.
- `utils/` - common utilities such as database and data helpers.
- `constants/` - shared endpoint constants.
- `test-data/` - payloads and static test files.

## Commands

```bash
npm install
npm run test:api
npm run test:api:headed-report
```

Set `ENVIRONMENT=DEV` or `ENVIRONMENT=PRODUCTION` to switch configuration.

## Slack reporting

Pushes to git trigger the Playwright GitHub Actions workflow in
`.github/workflows/playwright-slack-report.yml`.

Required secrets:

- `MS_USER_EMAIL`
- `MS_USER_PASSWORD`
- `MS_TOTP_SECRET`
- `MS_DEV_BASE_URL`
- `SLACK_WEBHOOK_URL`

The workflow writes a JSON Playwright report, formats it into a Slack summary
grouped by domain, and includes failed tests per domain in the message body.
