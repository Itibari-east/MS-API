#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
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
  const lastResult = test.results[test.results.length - 1] || {};
  const hasFailedResult = test.results.some((result) => result.status === 'failed' || result.status === 'timedOut');
  const hasSkippedResult = test.results.some((result) => result.status === 'skipped');
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
  const firstLine = (test.failure || 'No failure message available').split('\n')[0];
  return `- ${test.title}${location}\n  ${firstLine}`;
}

function buildSlackMarkdown(report) {
  const tests = flattenTests(report.suites || []).map(normalizeResult);
  const byDomain = groupByDomain(tests);
  const totals = summarizeTests(tests);
  const failures = tests.filter((test) => test.status === 'failed');
  const moduleName = process.env.PLAYWRIGHT_MODULE_NAME?.trim() || 'Playwright API';
  const environment = process.env.PLAYWRIGHT_ENVIRONMENT?.trim() || '';

  const lines = [];
  lines.push(`🧪 ${moduleName} Tests`);
  if (environment) {
    lines.push(`Environment: *${environment}*`);
  }
  lines.push(
    `Total: *${totals.total}*  Passed: *${totals.passed}*  Failed: *${totals.failed}*  Flaky: *${totals.flaky}*  Skipped: *${totals.skipped}*`,
  );
  lines.push('');

  for (const domain of Object.keys(byDomain).sort()) {
    const domainTests = byDomain[domain];
    const summary = summarizeTests(domainTests);
    lines.push(`*${domain}*`);
    lines.push(
      `Total: *${summary.total}*  Passed: *${summary.passed}*  Failed: *${summary.failed}*  Flaky: *${summary.flaky}*  Skipped: *${summary.skipped}*`,
    );

    const domainFailures = domainTests.filter((test) => test.status === 'failed');
    if (domainFailures.length) {
      lines.push('Failed tests:');
      for (const failure of domainFailures) {
        lines.push(formatFailure(failure));
      }
    } else {
      lines.push('Failed tests: none');
    }

    lines.push('');
  }

  if (failures.length) {
    lines.push('*Overall failures*');
    for (const failure of failures) {
      lines.push(formatFailure(failure));
    }
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
