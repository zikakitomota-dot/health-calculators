import assert from 'node:assert/strict';
import test from 'node:test';
import { detectChangedUrlsFromFiles, findCloudflareProductionCheck, runAutomaticIndexNow, runAutomaticIndexNowFailOpen } from './lib/indexnow-deployment.mjs';

const urls = [
  'https://health.zaleastudio.com/',
  'https://health.zaleastudio.com/about/',
  'https://health.zaleastudio.com/calculators/bmi/',
  'https://health.zaleastudio.com/calculators/tdee/',
];

test('no public change submits zero URLs', async () => {
  assert.deepEqual(detectChangedUrlsFromFiles(['README.md', 'scripts/lib/indexnow.mjs', 'public/favicon.svg'], urls), []);
  let submissions = 0;
  const fetchImpl = async (url) => new Response(String(url).endsWith('sitemap-index.xml')
    ? '<sitemapindex><sitemap><loc>https://health.zaleastudio.com/sitemap-0.xml</loc></sitemap></sitemapindex>'
    : `<urlset>${urls.map((item) => `<url><loc>${item}</loc></url>`).join('')}</urlset>`, { status: 200 });
  const result = await runAutomaticIndexNow({ files: ['README.md'], fetchImpl, submitImpl: async () => { submissions += 1; }, log: () => {} });
  assert.equal(submissions, 0);
  assert.deepEqual(result.submitted, []);
});

test('one changed calculator submits only its canonical URL', () => {
  assert.deepEqual(detectChangedUrlsFromFiles(['src/pages/calculators/tdee.astro'], urls), ['https://health.zaleastudio.com/calculators/tdee/']);
  assert.deepEqual(detectChangedUrlsFromFiles(['src/scripts/bmi.ts'], urls), ['https://health.zaleastudio.com/calculators/bmi/']);
});

test('multiple changed pages submit only their canonical URLs without duplicates', () => {
  assert.deepEqual(detectChangedUrlsFromFiles(['src/pages/about.astro', 'src/pages/calculators/bmi.astro', 'src/scripts/bmi.ts'], urls), [
    'https://health.zaleastudio.com/about/', 'https://health.zaleastudio.com/calculators/bmi/',
  ]);
});

test('shared calculator changes select calculators, while site-wide changes select all pages', () => {
  assert.deepEqual(detectChangedUrlsFromFiles(['src/layouts/CalculatorLayout.astro'], urls), urls.filter((url) => url.includes('/calculators/')));
  assert.deepEqual(detectChangedUrlsFromFiles(['src/layouts/BaseLayout.astro'], urls), [...urls].sort());
});

test('IndexNow failure is fail-open', async () => {
  const sitemapIndex = '<sitemapindex><sitemap><loc>https://health.zaleastudio.com/sitemap-0.xml</loc></sitemap></sitemapindex>';
  const sitemap = `<urlset>${urls.map((item) => `<url><loc>${item}</loc></url>`).join('')}</urlset>`;
  const fetchImpl = async (url) => {
    if (String(url).endsWith('sitemap-index.xml')) return new Response(sitemapIndex, { status: 200 });
    if (String(url).endsWith('.xml')) return new Response(sitemap, { status: 200 });
    return new Response(`<link rel="canonical" href="${url}">`, { status: 200, headers: { 'Content-Type': 'text/html' } });
  };
  const result = await runAutomaticIndexNowFailOpen({ files: ['src/pages/about.astro'], fetchImpl, submitImpl: async () => { throw new Error('HTTP 429'); }, log: () => {}, errorLog: () => {} });
  assert.equal(result.ok, false);
  assert.match(result.error, /429/u);
});

test('Cloudflare production check is identified exactly', () => {
  assert.equal(findCloudflareProductionCheck([{ name: 'other' }, { name: 'Workers Builds: health-calculators', conclusion: 'success' }]).conclusion, 'success');
});
