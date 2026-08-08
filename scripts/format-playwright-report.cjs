#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function stripAnsi(value) {
  return String(value || '').replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-9;]*m/g,
    '',
  );
}

function getGitHubRunUrl() {
  const repository = process.env.GITHUB_REPOSITORY?.trim();
  const runId = process.env.GITHUB_RUN_ID?.trim();
  const serverUrl = process.env.GITHUB_SERVER_URL?.trim() || 'https://github.com';

  if (!repository || !runId) {
    return '';
  }

  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Dar_es_Salaam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function toModuleSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bapi\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function toTitleCase(value) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDomainFromFile(fileName) {
  const normalized = fileName.replace(/\\/g, '/');
  const moduleLabels = {
    auth: 'Auth',
    accounting: 'Accounting',
    commercials: 'Commercials',
    inventory: 'Inventory',
    suppliers: 'Supplier',
    supplier: 'Supplier',
    usermanagement: 'User Management',
  };

  const testsMatch = normalized.match(/(?:^|\/)tests\/([^/]+)/);
  if (testsMatch) {
    return moduleLabels[testsMatch[1]] || toTitleCase(testsMatch[1]);
  }

  const parts = normalized.split('/').filter(Boolean);
  const modulePart = parts.find((part) => moduleLabels[part] || ['auth', 'accounting', 'commercials', 'inventory', 'suppliers', 'supplier', 'usermanagement'].includes(part));
  if (modulePart) {
    return moduleLabels[modulePart] || toTitleCase(modulePart);
  }

  return 'Other';
}

function resolveCoverageNotePath() {
  const explicitPath = process.env.PLAYWRIGHT_COVERAGE_NOTE_PATH?.trim();
  if (explicitPath && fs.existsSync(explicitPath)) {
    return explicitPath;
  }

  const moduleSlug = process.env.PLAYWRIGHT_MODULE_SLUG?.trim() || toModuleSlug(process.env.PLAYWRIGHT_MODULE_NAME);
  if (!moduleSlug) {
    return '';
  }

  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    return '';
  }

  const candidates = fs
    .readdirSync(reportsDir)
    .map((fileName) => {
      const normalized = fileName.toLowerCase();
      const exactMatch =
        normalized.startsWith(`${moduleSlug}-coverage`) ||
        normalized.startsWith(`${moduleSlug}-issues`);
      const looseMatch =
        normalized.includes(moduleSlug) &&
        (normalized.includes('coverage') || normalized.includes('issues'));

      return {
        filePath: path.join(reportsDir, fileName),
        score: exactMatch ? 2 : looseMatch ? 1 : 0,
      };
    })
    .filter((candidate) => candidate.score > 0 && candidate.filePath.toLowerCase().endsWith('.md'))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftStat = fs.statSync(left.filePath);
      const rightStat = fs.statSync(right.filePath);
      return rightStat.mtimeMs - leftStat.mtimeMs;
    })
    .map((candidate) => candidate.filePath);

  return candidates[0] || '';
}

function readTextFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf8').trim();
}

function flattenTests(suites, bucket = []) {
  for (const suite of suites || []) {
    if (Array.isArray(suite.suites) && suite.suites.length) {
      flattenTests(suite.suites, bucket);
    }

    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        bucket.push({
          title: spec.title || test.title || 'Unnamed test',
          file: spec.location?.file || suite.file || '',
          line: spec.location?.line || test.location?.line || 0,
          projectName: test.projectName || '',
          expectedStatus: test.expectedStatus || 'passed',
          results: test.results || [],
        });
      }
    }
  }

  return bucket;
}

function normalizeResult(test) {
  const results = test.results || [];
  const lastResult = results[results.length - 1] || {};
  const hasFailedResult = results.some((result) => result.status === 'failed' || result.status === 'timedOut');
  const hasSkippedResult = results.some((result) => result.status === 'skipped');
  const status =
    lastResult.status === 'failed' || lastResult.status === 'timedOut'
      ? 'failed'
      : lastResult.status === 'skipped'
        ? 'skipped'
        : hasFailedResult
          ? 'flaky'
          : 'passed';
  const failure = test.results.find((result) => result.status === 'failed' || result.status === 'timedOut');
  const errorText = failure?.error?.message || failure?.error?.stack || '';

  return {
    ...test,
    status,
    failure: errorText,
    domain: getDomainFromFile(test.file),
  };
}

function groupByDomain(tests) {
  return tests.reduce((acc, test) => {
    if (!acc[test.domain]) {
      acc[test.domain] = [];
    }

    acc[test.domain].push(test);
    return acc;
  }, {});
}

function summarizeTests(tests) {
  return tests.reduce(
    (acc, test) => {
      acc.total += 1;
      acc[test.status] += 1;
      return acc;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
  );
}

function formatFailure(test) {
  const location = test.file ? ` (${path.relative(process.cwd(), test.file)}:${test.line || 1})` : '';
  return `- ${test.title}${location}`;
}

function buildSlackMarkdown(report) {
  const tests = flattenTests(report.suites || []).map(normalizeResult);
  const byDomain = groupByDomain(tests);
  const totals = summarizeTests(tests);
  const failures = tests.filter((test) => test.status === 'failed');
  const moduleName = process.env.PLAYWRIGHT_MODULE_NAME?.trim() || 'Playwright API';
  const environment = process.env.PLAYWRIGHT_ENVIRONMENT?.trim() || '';
  const githubRunUrl = getGitHubRunUrl();
  const coverageNotePath = resolveCoverageNotePath();
  const coverageNote = readTextFile(coverageNotePath);

  const lines = [];
  lines.push(`🧪 ${moduleName} Coverage Report`);
  lines.push(`Date: ${getTodayLabel()}`);
  if (environment) {
    lines.push(`Environment: *${environment}*`);
  }
  if (githubRunUrl) {
    lines.push(`Build: <${githubRunUrl}|View GitHub run>`);
  }
  lines.push(
    `✅ *${totals.passed}*  ❌ *${totals.failed}*  ⏩ *${totals.skipped}*  🟡 *${totals.flaky}*  Total: *${totals.total}*`,
  );
  lines.push('');

  if (coverageNote) {
    lines.push(coverageNote);
    lines.push('');
  } else {
    lines.push('## Covered');
    const coveredTests = tests.filter((test) => test.status === 'passed');
    if (coveredTests.length) {
      for (const test of coveredTests) {
        lines.push(formatFailure(test).replace(/^-\s*/, '- '));
      }
    } else {
      lines.push('- None');
    }

    lines.push('');
    lines.push('## Expected Failures');
    const expectedFailures = tests.filter((test) => test.expectedStatus === 'failed');
    if (expectedFailures.length) {
      for (const test of expectedFailures) {
        lines.push(formatFailure(test));
      }
    } else {
      lines.push('- None');
    }

    lines.push('');
    lines.push('## Missing Coverage');
    lines.push('- See the module coverage note for the planned scenarios still not automated.');
    lines.push('');
  }

  lines.push('## Current Run');
  for (const domain of Object.keys(byDomain).sort()) {
    const domainTests = byDomain[domain];
    const summary = summarizeTests(domainTests);
    lines.push(`*${domain}*`);
    lines.push(`✅ *${summary.passed}*  ❌ *${summary.failed}*  ⏩ *${summary.skipped}*  🟡 *${summary.flaky}*`);

    const domainFailures = domainTests.filter((test) => test.status === 'failed');
    if (domainFailures.length) {
      lines.push('Failed endpoints:');
      for (const failure of domainFailures) {
        lines.push(formatFailure(failure));
      }
    }

    lines.push('');
  }

  if (githubRunUrl) {
    lines.push(`Logs: <${githubRunUrl}|View GitHub run>`);
  }

  return lines.join('\n').trim();
}

async function postToSlack(webhookUrl, markdown) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: markdown }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook request failed with ${response.status} ${response.statusText}`);
  }
}

async function main() {
  const reportPath = process.argv[2] || process.env.PLAYWRIGHT_JSON_REPORT || 'test-results/playwright-report.json';
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL?.trim() || '';

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Playwright JSON report not found at ${reportPath}`);
  }

  const report = readJson(reportPath);
  const markdown = buildSlackMarkdown(report);
  console.log(markdown);

  if (slackWebhookUrl) {
    await postToSlack(slackWebhookUrl, markdown);
    console.log('Slack notification sent.');
  } else {
    console.log('SLACK_WEBHOOK_URL not set; skipped Slack delivery.');
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
