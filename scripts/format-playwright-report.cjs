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

function getReportTitle() {
  const explicitTitle = process.env.PLAYWRIGHT_REPORT_TITLE?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const moduleName = process.env.PLAYWRIGHT_MODULE_NAME?.trim() || 'Playwright API';
  return `${moduleName} Coverage Report`;
}

function getReportLayout() {
  return process.env.PLAYWRIGHT_REPORT_LAYOUT?.trim().toLowerCase() || 'service';
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
  return `*${title}*`;
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
  const codeBlockSections = new Set(['covered', 'expected failures', 'failed', 'skipped', 'missing coverage']);

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
    const titleMatch = line.match(/^#\s+(.+)$/);
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (titleMatch) {
      flushSection();
      outputLines.push(`*${titleMatch[1].trim()}*`);
      continue;
    }

    if (headingMatch) {
      flushSection();
      currentSectionTitle = headingMatch[1].trim().toLowerCase();
      inCodeBlockSection = codeBlockSections.has(currentSectionTitle);
      outputLines.push(formatSectionHeading(headingMatch[1].trim()));
      continue;
    }

    if (inCodeBlockSection || currentSectionTitle === 'covered' || currentSectionTitle === 'missing coverage') {
      if (line.trim()) {
        sectionLines.push(line);
      }
      continue;
    }

    const dateMatch = line.match(/^Date:\s*(.+)$/i);
    if (dateMatch) {
      outputLines.push(`Date: *${dateMatch[1].trim()}*`);
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

function formatWorkflowSummaryLine(domain, summary) {
  const icon = summary.failed > 0 ? '❌' : '✅';
  return `${icon} ${domain} — ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped`;
}

function formatPassRate(passed, total) {
  if (!total) {
    return '0%';
  }

  return `${Math.round((passed / total) * 100)}%`;
}

function buildModuleSummaryTableLines(workflowSummaries, totals) {
  const rows = workflowSummaries.map(({ domain, summary }) => ({
    module: summary.failed > 0 ? `❌ ${domain}` : summary.skipped > 0 ? `⚠️ ${domain}` : `✅ ${domain}`,
    total: String(summary.total),
    passed: String(summary.passed),
    failed: String(summary.failed),
    skipped: String(summary.skipped),
    passRate: formatPassRate(summary.passed, summary.total),
  }));

  rows.push({
    module: 'Overall',
    total: String(totals.total),
    passed: String(totals.passed),
    failed: String(totals.failed),
    skipped: String(totals.skipped),
    passRate: formatPassRate(totals.passed, totals.total),
  });

  const headers = ['Module', 'Total', 'Passed', 'Failed', 'Skipped', 'Pass Rate'];
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => String([row.module, row.total, row.passed, row.failed, row.skipped, row.passRate][index]).length),
    ),
  );

  const formatRow = (cells) => cells.map((cell, index) => String(cell).padEnd(widths[index], ' ')).join('   ');
  const separator = widths.map((width) => '-'.repeat(width)).join('   ');

  const lines = [];
  lines.push(`🟢 *${totals.passed}* Passed   🔴 *${totals.failed}* Failed   ⏭️ *${totals.skipped}* Skipped   Total: *${totals.total}*`);
  lines.push(`Overall Pass Rate: *${formatPassRate(totals.passed, totals.total)}*`);
  lines.push('');
  lines.push('*Module Summary*');
  lines.push('```');
  lines.push(formatRow(headers));
  lines.push(separator);
  for (const row of rows) {
    lines.push(formatRow([row.module, row.total, row.passed, row.failed, row.skipped, row.passRate]));
  }
  lines.push('```');

  return lines;
}

function buildModuleSummaryTableOnlyLines(workflowSummaries, totals) {
  const rows = workflowSummaries.map(({ domain, summary }) => ({
    module: summary.failed > 0 ? `❌ ${domain}` : summary.skipped > 0 ? `⚠️ ${domain}` : `✅ ${domain}`,
    total: String(summary.total),
    passed: String(summary.passed),
    failed: String(summary.failed),
    skipped: String(summary.skipped),
    passRate: formatPassRate(summary.passed, summary.total),
  }));

  rows.push({
    module: 'Overall',
    total: String(totals.total),
    passed: String(totals.passed),
    failed: String(totals.failed),
    skipped: String(totals.skipped),
    passRate: formatPassRate(totals.passed, totals.total),
  });

  const headers = ['Module', 'Total', 'Passed', 'Failed', 'Skipped', 'Pass Rate'];
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => String([row.module, row.total, row.passed, row.failed, row.skipped, row.passRate][index]).length),
    ),
  );

  const formatRow = (cells) => cells.map((cell, index) => String(cell).padEnd(widths[index], ' ')).join('   ');
  const separator = widths.map((width) => '-'.repeat(width)).join('   ');

  const lines = [];
  lines.push('*Module Summary*');
  lines.push('```');
  lines.push(formatRow(headers));
  lines.push(separator);
  for (const row of rows) {
    lines.push(formatRow([row.module, row.total, row.passed, row.failed, row.skipped, row.passRate]));
  }
  lines.push('```');

  return lines;
}

function buildServiceSummaryLines(workflowSummaries, totals) {
  const lines = [];
  lines.push(...buildModuleSummaryTableOnlyLines(workflowSummaries, totals));
  return lines;
}

function formatTestBullets(tests) {
  return tests.length
    ? tests.map((test) => `- ${formatTestTitle(test)}${test.file ? ` (${formatTestLocation(test)})` : ''}`)
    : ['- None'];
}

function buildModuleHeaderLines(domain, summary, environment, githubRunUrl) {
  const lines = [];
  lines.push(`*${domain} API Coverage Report*`);
  lines.push(`Date: *${getTodayLabel()}*`);
  if (environment) {
    lines.push(`Environment: *${environment}*`);
  }
  if (githubRunUrl) {
    lines.push(`Build: <${githubRunUrl}|View GitHub run>`);
  }
  lines.push(
    `✅ *${summary.passed}*  ❌ *${summary.failed}*  ⏭️ *${summary.skipped}*  🟡 *${summary.flaky || 0}*  Total: *${summary.total}*`,
  );

  return lines;
}

function buildModuleBreakdownLines(domain, tests, coverageNote, options = {}) {
  const { includeHeader = false, environment = '', githubRunUrl = '' } = options;
  const coveredTests = tests.filter((test) => test.status === 'passed');
  const failedTests = tests.filter((test) => test.status === 'failed');
  const skippedTests = tests.filter((test) => test.status === 'skipped');
  const expectedFailures = tests.filter((test) => test.expectedStatus === 'failed');
  const summary = summarizeTests(tests);

  const lines = [];
  if (includeHeader) {
    lines.push(...buildModuleHeaderLines(domain, summary, environment, githubRunUrl));
    lines.push('');
  }
  lines.push(`*${domain}*`);

  if (coverageNote) {
    lines.push(formatCoverageNoteForSlack(coverageNote));
    lines.push('');
    return lines;
  }

  lines.push(formatSectionHeading('Covered'));
  lines.push(...formatCodeBlock(formatTestBullets(coveredTests)));
  lines.push('');

  lines.push(formatSectionHeading('Failed'));
  lines.push(...formatCodeBlock(formatTestBullets(failedTests)));
  lines.push('');

  lines.push(formatSectionHeading('Skipped'));
  lines.push(...formatCodeBlock(formatTestBullets(skippedTests)));
  lines.push('');

  lines.push(formatSectionHeading('Expected Failures'));
  lines.push(...formatCodeBlock(formatTestBullets(expectedFailures)));
  lines.push('');

  lines.push(formatSectionHeading('Missing Coverage'));
  lines.push(...formatCodeBlock(['See the module coverage note for the planned scenarios still not automated.']));
  lines.push('');

  return lines;
}

function sortWorkflowSummaries(summaries) {
  return [...summaries].sort((left, right) => {
    if (left.summary.failed !== right.summary.failed) {
      return right.summary.failed - left.summary.failed;
    }

    if (left.summary.skipped !== right.summary.skipped) {
      return right.summary.skipped - left.summary.skipped;
    }

    return left.domain.localeCompare(right.domain);
  });
}

function buildSlackMarkdown(report) {
  return buildSlackMessageParts(report).fullText;
}

function buildSlackMessageParts(report) {
  const tests = flattenTests(report.suites || []).map(normalizeResult);
  const byDomain = groupByDomain(tests);
  const totals = summarizeTests(tests);
  const environment = process.env.PLAYWRIGHT_ENVIRONMENT?.trim() || '';
  const githubRunUrl = getGitHubRunUrl();
  const reportLayout = getReportLayout();
  const coverageNotePath = reportLayout === 'service' ? resolveCoverageNotePath() : '';
  const coverageNote = readTextFile(coverageNotePath);
  const workflowSummaries = sortWorkflowSummaries(
    Object.keys(byDomain).map((domain) => ({
      domain,
      summary: summarizeTests(byDomain[domain]),
    })),
  );

  const summaryLines = [];
  summaryLines.push(`*${getReportTitle()}*`);
  summaryLines.push(`Date: *${getTodayLabel()}*`);
  if (environment) {
    summaryLines.push(`Environment: *${environment}*`);
  }
  if (githubRunUrl) {
    summaryLines.push(`Build: <${githubRunUrl}|View GitHub run>`);
  }
  summaryLines.push('');

  const threadMessages = [];
  if (reportLayout === 'full-run') {
    summaryLines.push(...buildModuleSummaryTableLines(workflowSummaries, totals));
    summaryLines.push('');
    for (const { domain } of workflowSummaries) {
      threadMessages.push(
        buildModuleBreakdownLines(domain, byDomain[domain] || [], '', {
          includeHeader: true,
          environment,
          githubRunUrl,
        }).join('\n').trim(),
      );
    }
  } else {
    summaryLines.push(...buildServiceSummaryLines(workflowSummaries, totals));
    summaryLines.push('');
    if (coverageNote && workflowSummaries.length <= 1) {
      const domain = workflowSummaries[0]?.domain || getReportTitle().replace(/\s+Coverage Report$/i, '');
      threadMessages.push(
        buildModuleBreakdownLines(domain, byDomain[domain] || [], coverageNote, {
          includeHeader: true,
          environment,
          githubRunUrl,
        }).join('\n').trim(),
      );
    } else {
      for (const { domain } of workflowSummaries) {
        threadMessages.push(buildModuleBreakdownLines(domain, byDomain[domain] || [], '').join('\n').trim());
      }
    }
  }

  if (githubRunUrl) {
    summaryLines.push(`*Logs:* <${githubRunUrl}|View GitHub run>`);
  }

  const summaryText = summaryLines.join('\n').trim();
  const fallbackThreadText = threadMessages.filter(Boolean).join('\n\n').trim();
  const fullText = [summaryText, fallbackThreadText].filter(Boolean).join('\n\n').trim();

  return {
    summaryText,
    threadMessages: threadMessages.filter(Boolean),
    fullText,
  };
}

async function postSlackMessage({ webhookUrl = '', botToken = '', channelId = '', text = '', threadTs = '' }) {
  if (botToken && channelId) {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${botToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text,
        thread_ts: threadTs || undefined,
        mrkdwn: true,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      const errorMessage = payload?.error ? `${response.status} ${response.statusText} (${payload.error})` : `${response.status} ${response.statusText}`;
      throw new Error(`Slack API request failed with ${errorMessage}`);
    }

    return payload.ts || '';
  }

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook request failed with ${response.status} ${response.statusText}`);
    }

    return '';
  }

  throw new Error('No Slack delivery configured. Set SLACK_BOT_TOKEN + SLACK_CHANNEL_ID or SLACK_WEBHOOK_URL.');
}

async function postSlackReport(report, parts = buildSlackMessageParts(report)) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL?.trim() || '';
  const slackBotToken = process.env.SLACK_BOT_TOKEN?.trim() || '';
  const slackChannelId = process.env.SLACK_CHANNEL_ID?.trim() || '';
  const { summaryText, threadMessages, fullText } = parts;

  if (slackBotToken && slackChannelId) {
    const threadTs = await postSlackMessage({
      botToken: slackBotToken,
      channelId: slackChannelId,
      text: summaryText,
    });

    for (const message of threadMessages) {
      await postSlackMessage({
        botToken: slackBotToken,
        channelId: slackChannelId,
        text: message,
        threadTs,
      });
    }

    return;
  }

  await postSlackMessage({
    webhookUrl: slackWebhookUrl,
    text: fullText,
  });
}

async function main() {
  const reportPath = process.argv[2] || process.env.PLAYWRIGHT_JSON_REPORT || 'test-results/playwright-report.json';

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Playwright JSON report not found at ${reportPath}`);
  }

  const report = readJson(reportPath);
  const parts = buildSlackMessageParts(report);
  console.log(parts.fullText);

  if (process.env.SLACK_BOT_TOKEN?.trim() && process.env.SLACK_CHANNEL_ID?.trim()) {
    await postSlackReport(report, parts);
    console.log('Slack notification sent.');
  } else if (process.env.SLACK_WEBHOOK_URL?.trim()) {
    await postSlackReport(report, parts);
    console.log('Slack notification sent.');
  } else {
    console.log('SLACK_WEBHOOK_URL not set; skipped Slack delivery.');
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
