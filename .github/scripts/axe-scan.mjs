import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const URLS = [
  'http://localhost:3000',
  'http://localhost:3000/giris',
  'http://localhost:3000/kayit',
  'http://localhost:3000/arama',
];

const browser = await chromium.launch();
let failCount = 0;
for (const url of URLS) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  console.log(`\n=== ${url} ===`);
  console.log(`Violations: ${result.violations.length}`);
  for (const v of result.violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} nodes`);
  }
  const critical = result.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (critical.length > 0) {
    failCount++;
  }
  await ctx.close();
}
await browser.close();

if (failCount > 0) {
  console.error(`\nA11y FAIL: ${failCount} URL with critical/serious violations`);
  process.exit(1);
}
console.log('\nA11y OK ✓');
