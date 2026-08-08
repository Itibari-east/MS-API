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

function getFailedResult(test) {
  const results = test.results || [];
  const failedResults = results.filter((result) => result.status === 'failed' || result.status === 'timedOut');
  return failedResults[failedResults.length - 1] || results[results.length - 1] || {};
}

function readStdIOEntry(entry) {
  if (!entry) {
    return '';
  }

  if (typeof entry.text === 'string') {
    return entry.text;
  }

  if (typeof entry.buffer === 'string') {
    return Buffer.from(entry.buffer, 'base64').toString('utf8');
  }

  return '';
}

function normalizeTextBlock(value) {
  return stripAnsi(value)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateText(value, maxLength = 1200) {
  const text = normalizeTextBlock(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}\n... [truncated ${text.length - maxLength} characters]`;
}

function quotedBlock(label, value, maxLength = 1200) {
  const text = truncateText(value, maxLength);
  if (!text) {
    return '';
  }

  const quotedLines = text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  return `*${label}:*\n${quotedLines}`;
}

function formatAttachments(attachments = []) {
  if (!attachments.length) {
    return '';
  }

  const lines = attachments.map((attachment) => {
    const fileName = attachment.path ? path.basename(attachment.path) : '';
    const name = attachment.name || 'attachment';
    const suffix = fileName && fileName !== name ? ` (${fileName})` : '';
    return `- ${name}${suffix}${attachment.contentType ? ` [${attachment.contentType}]` : ''}`;
  });

  return [`*Attachments:*`, ...lines].join('\n');
}

function formatStream(title, entries) {
  const content = entries.map(readStdIOEntry).filter(Boolean).join('\n');
  if (!content.trim()) {
    return '';
  }

  return quotedBlock(title, content, 1000);
}

function formatFailureDetails(test) {
  const failedResult = getFailedResult(test);
  const errorParts = [];
  const githubRunUrl = getGitHubRunUrl();

  if (failedResult.error?.message) {
    errorParts.push(failedResult.error.message);
  }

  if (failedResult.error?.stack && failedResult.error.stack !== failedResult.error.message) {
    errorParts.push(failedResult.error.stack);
  }

  for (const additionalError of failedResult.errors || []) {
    if (additionalError?.message) {
      errorParts.push(additionalError.message);
    }
  }

  const sections = [];
  const errorSection = quotedBlock('Error', errorParts.join('\n\n') || 'No failure message available', 1600);
  if (errorSection) {
    sections.push(errorSection);
  }

  const stdoutSection = formatStream('Stdout', failedResult.stdout || []);
  if (stdoutSection) {
    sections.push(stdoutSection);
  }

  const stderrSection = formatStream('Stderr', failedResult.stderr || []);
  if (stderrSection) {
    sections.push(stderrSection);
  }

  const attachmentSection = formatAttachments(failedResult.attachments || []);
  if (attachmentSection) {
    sections.push(attachmentSection);
  }

  if (githubRunUrl) {
    sections.push(`*GitHub run:*\n<${githubRunUrl}|View GitHub run>`);
  }

  return sections.join('\n');
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
    failureResult: getFailedResult(test),
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
  const failedResult = test.failureResult || {};
  const retryText = typeof failedResult.retry === 'number' ? `  Retry: ${failedResult.retry + 1}` : '';
  const durationText = typeof failedResult.duration === 'number' ? `  Duration: ${failedResult.duration}ms` : '';
  const details = formatFailureDetails({ ...test, failureResult: failedResult });

  return [`- ${test.title}${location}${retryText}${durationText}`, details ? details : '  No failure details available'].join('\n');
}

function buildSlackMarkdown(report) {
  const tests = flattenTests(report.suites || []).map(normalizeResult);
  const byDomain = groupByDomain(tests);
  const totals = summarizeTests(tests);
  const failures = tests.filter((test) => test.status === 'failed');
  const moduleName = process.env.PLAYWRIGHT_MODULE_NAME?.trim() || 'Playwright API';
  const environment = process.env.PLAYWRIGHT_ENVIRONMENT?.trim() || '';
  const githubRunUrl = getGitHubRunUrl();

  const lines = [];
  lines.push(`🧪 ${moduleName} Tests`);
  if (environment) {
    lines.push(`Environment: *${environment}*`);
  }
  if (githubRunUrl) {
    lines.push(`Build: <${githubRunUrl}|View GitHub run>`);
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
