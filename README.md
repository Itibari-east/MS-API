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
