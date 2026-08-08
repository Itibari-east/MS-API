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
    const testName = testsMatch[1]
      .replace(/\.spec\.[^.]+$/i, '')
      .replace(/\.spec$/i, '')
      .replace(/\.[^.]+$/i, '');
    return moduleLabels[testName] || toTitleCase(testName);
  }

  const parts = normalized.split('/').filter(Boolean);
  const modulePart = parts.find((part) => moduleLabels[part] || ['auth', 'accounting', 'commercials', 'inventory', 'suppliers', 'supplier', 'usermanagement'].includes(part));
  if (modulePart) {
    return moduleLabels[modulePart] || toTitleCase(modulePart);
  }

  return 'Other';
}

function formatTestLocation(test) {
  if (!test.file) {
    return '';
  }

  const fileName = path.basename(test.file);
  return `${fileName}:${test.line || 1}`;
}

function formatSectionHeading(title) {
  return `*## ${title}*`;
}

function formatCodeBlock(lines) {
  return ['```', ...lines, '```'];
}

function getCoveragePrefix() {
  const moduleName = String(process.env.PLAYWRIGHT_MODULE_NAME || '').toLowerCase();
  if (moduleName.includes('auth')) return 'login';
  if (moduleName.includes('supplier')) return 'supplier';
  if (moduleName.includes('user')) return 'user';
  if (moduleName.includes('commercial')) return 'commercial';
  if (moduleName.includes('inventory')) return 'inventory';
  if (moduleName.includes('accounting')) return 'accounting';
  return '';
}

function prefixCoverageItem(line) {
  const trimmed = String(line || '').trim();
  if (!/^-\s+(returns|rejects)\b/i.test(trimmed)) {
    return trimmed;
  }

  const prefix = getCoveragePrefix();
  if (!prefix) {
    return trimmed;
  }

  return trimmed.replace(/^-\s+/, `- ${prefix} `);
}

function normalizeRouteLabel(route) {
  const cleanedRoute = String(route || '')
    .replace(/\?.*$/, '')
    .replace(/#.*$/, '')
    .replace(/^\/+/, '')
    .trim();

  if (!cleanedRoute) {
    return '';
  }

  const segments = cleanedRoute
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .trim(),
    );

  const last = (segments[segments.length - 1] || '').toLowerCase();
  const previous = (segments[segments.length - 2] || '').toLowerCase();

  if (last === 'login') return 'login';
  if (last === 'verify' && previous === 'mfa') return 'mfa verify';
  if (last === 'setup' && previous === 'mfa') return 'mfa setup';
  if (last === 'confirm' && previous === 'setup' && segments.some((segment) => segment.toLowerCase() === 'mfa')) {
    return 'mfa setup confirm';
  }
  if (last === 'forget password' || last === 'forgetpassword' || last === 'forgot password') {
    return 'forgot password';
  }
  if (segments.length >= 2) {
    return `${segments[segments.length - 2]} ${segments[segments.length - 1]}`.trim();
  }

  return segments[0] || '';
}

function getEndpointLabelFromSuiteTitles(suiteTitles = [], fileName = '') {
  const routeTitle = [...suiteTitles].reverse().find((title) => /\b(GET|POST|PUT|PATCH|DELETE)\s+\/?/i.test(title));

  if (routeTitle) {
    const match = routeTitle.match(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i);
    if (match?.[1]) {
      const label = normalizeRouteLabel(match[1]);
      if (label) {
        return label;
      }
    }
  }

  const normalizedFile = path.basename(fileName || '').toLowerCase();
  if (normalizedFile === 'auth.spec.ts') return 'login';
  if (normalizedFile.includes('supplier')) return 'supplier';
  if (normalizedFile.includes('user')) return 'user';

  return '';
}

function formatTestTitle(test) {
  const title = stripAnsi(test.title || 'Unnamed test').trim();
  if (!/^(returns|rejects)\b/i.test(title)) {
    return title;
  }

  const endpointLabel = getEndpointLabelFromSuiteTitles(test.suiteTitles || [], test.file);
  if (!endpointLabel) {
    return title;
  }

  return `${endpointLabel} ${title}`;
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

function formatCoverageNoteForSlack(note) {
  const inputLines = String(note || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const outputLines = [];
  let currentSectionTitle = '';
  let inCodeBlockSection = false;
  let sectionLines = [];
  const codeBlockSections = new Set(['covered', 'expected failures', 'failed', 'skipped']);

  const flushSection = () => {
    if (!sectionLines.length) {
      return;
    }

    if (inCodeBlockSection) {
      outputLines.push(...formatCodeBlock(sectionLines.map(prefixCoverageItem)));
    } else {
      outputLines.push(...sectionLines);
    }

    sectionLines = [];
  };

  for (const rawLine of inputLines) {
    const line = rawLine.replace(/\s+$/, '');
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      flushSection();
      currentSectionTitle = headingMatch[1].trim().toLowerCase();
      inCodeBlockSection = codeBlockSections.has(currentSectionTitle);
      outputLines.push(formatSectionHeading(headingMatch[1].trim()));
      continue;
    }

    if (inCodeBlockSection || currentSectionTitle === 'covered') {
      if (line.trim()) {
        sectionLines.push(line);
      }
      continue;
    }

    outputLines.push(line);
  }

  flushSection();

  return outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function flattenTests(suites, bucket = [], ancestors = []) {
  for (const suite of suites || []) {
    const suiteTitles = suite.title ? [...ancestors, suite.title] : ancestors;

    if (Array.isArray(suite.suites) && suite.suites.length) {
      flattenTests(suite.suites, bucket, suiteTitles);
    }

    for (const spec of suite.specs || []) {
      const specTitles = spec.title ? [...suiteTitles, spec.title] : suiteTitles;
      for (const test of spec.tests || []) {
        bucket.push({
          title: spec.title || test.title || 'Unnamed test',
          file: spec.location?.file || suite.file || '',
          line: spec.location?.line || test.location?.line || 0,
          suiteTitles: specTitles,
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

function buildSlackMarkdown(report) {
  const tests = flattenTests(report.suites || []).map(normalizeResult);
  const byDomain = groupByDomain(tests);
  const totals = summarizeTests(tests);
  const moduleName = process.env.PLAYWRIGHT_MODULE_NAME?.trim() || 'Playwright API';
  const environment = process.env.PLAYWRIGHT_ENVIRONMENT?.trim() || '';
  const githubRunUrl = getGitHubRunUrl();
  const coverageNotePath = resolveCoverageNotePath();
  const coverageNote = readTextFile(coverageNotePath);
  const coveredTests = tests.filter((test) => test.status === 'passed');
  const failedTests = tests.filter((test) => test.status === 'failed');
  const skippedTests = tests.filter((test) => test.status === 'skipped');
  const expectedFailures = tests.filter((test) => test.expectedStatus === 'failed');

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

  lines.push('*Per-workflow:*');
  for (const domain of Object.keys(byDomain).sort()) {
    const summary = summarizeTests(byDomain[domain]);
    const icon = summary.failed > 0 ? '❌' : '✅';
    lines.push(
      `${icon} ${domain} — ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped`,
    );
  }
  lines.push('');

  if (coverageNote) {
    lines.push(formatCoverageNoteForSlack(coverageNote));
    lines.push('');
  } else {
    lines.push(formatSectionHeading('Covered'));
    lines.push(
      ...formatCodeBlock(
        coveredTests.length
          ? coveredTests.map((test) => `- ${formatTestTitle(test)}${test.file ? ` (${formatTestLocation(test)})` : ''}`)
          : ['- None'],
      ),
    );
    lines.push('');

    lines.push('');
    lines.push(formatSectionHeading('Failed'));
    lines.push(
      ...formatCodeBlock(
        failedTests.length
          ? failedTests.map((test) => `- ${formatTestTitle(test)}${test.file ? ` (${formatTestLocation(test)})` : ''}`)
          : ['- None'],
      ),
    );
    lines.push('');

    lines.push(formatSectionHeading('Skipped'));
    lines.push(
      ...formatCodeBlock(
        skippedTests.length
          ? skippedTests.map((test) => `- ${formatTestTitle(test)}${test.file ? ` (${formatTestLocation(test)})` : ''}`)
          : ['- None'],
      ),
    );
    lines.push('');

    lines.push(formatSectionHeading('Expected Failures'));
    lines.push(
      ...formatCodeBlock(
        expectedFailures.length
          ? expectedFailures.map((test) => `- ${formatTestTitle(test)}${test.file ? ` (${formatTestLocation(test)})` : ''}`)
          : ['- None'],
      ),
    );

    lines.push('');
    lines.push(formatSectionHeading('Missing Coverage'));
    lines.push('- See the module coverage note for the planned scenarios still not automated.');
    lines.push('');
  }

  if (githubRunUrl) {
    lines.push(`*Logs:* <${githubRunUrl}|View GitHub run>`);
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
