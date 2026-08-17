import { chromium } from '@playwright/test';

const target = process.argv[2];
if (!target) throw new Error('Usage: node tests/performance.mjs <url>');

const browser = await chromium.launch();

async function sample(context, label, index) {
  const page = await context.newPage();
  const startedAt = performance.now();
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60_000 });
  const wallMs = performance.now() - startedAt;
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const scripts = performance.getEntriesByType('resource').filter((entry) =>
      entry.name.includes('/assets/') && entry.name.includes('.js')
    );
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime])
    );
    return {
      responseStartMs: navigation.responseStart,
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      loadMs: navigation.loadEventEnd,
      transferBytes: navigation.transferSize + scripts.reduce((sum, entry) => sum + entry.transferSize, 0),
      jsTransferBytes: scripts.reduce((sum, entry) => sum + entry.transferSize, 0),
      jsDurationMs: scripts.reduce((sum, entry) => sum + entry.duration, 0),
      firstPaintMs: paints['first-paint'] ?? null,
      firstContentfulPaintMs: paints['first-contentful-paint'] ?? null,
    };
  });
  await page.close();
  return { label, index, wallMs: Math.round(wallMs), ...metrics };
}

const observations = [];
for (let index = 1; index <= 5; index += 1) {
  const context = await browser.newContext();
  observations.push(await sample(context, 'cold', index));
  await context.close();
}

const warmContext = await browser.newContext();
for (let index = 1; index <= 5; index += 1) {
  observations.push(await sample(warmContext, 'warm', index));
}
await warmContext.close();
await browser.close();

function summarize(label, key) {
  const values = observations
    .filter((entry) => entry.label === label)
    .map((entry) => entry[key])
    .filter((value) => typeof value === 'number')
    .sort((a, b) => a - b);
  return { median: values[Math.floor(values.length / 2)], max: values.at(-1) };
}

console.log(JSON.stringify({
  target,
  observations,
  summary: {
    cold: {
      wallMs: summarize('cold', 'wallMs'),
      responseStartMs: summarize('cold', 'responseStartMs'),
      firstContentfulPaintMs: summarize('cold', 'firstContentfulPaintMs'),
      jsDurationMs: summarize('cold', 'jsDurationMs'),
    },
    warm: {
      wallMs: summarize('warm', 'wallMs'),
      responseStartMs: summarize('warm', 'responseStartMs'),
      firstContentfulPaintMs: summarize('warm', 'firstContentfulPaintMs'),
      jsDurationMs: summarize('warm', 'jsDurationMs'),
    },
  },
}, null, 2));
