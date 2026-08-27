import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INDEXNOW_ENDPOINT, INDEXNOW_HOST, INDEXNOW_KEY, INDEXNOW_KEY_LOCATION,
  createIndexNowPayload, fetchSitemapUrls, normalizeIndexNowUrls, submitIndexNowUrls, validateLiveUrls,
} from './lib/indexnow.mjs';

const sitemapIndex = '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://health.zaleastudio.com/sitemap-0.xml</loc></sitemap></sitemapindex>';
const sitemap = '<?xml version="1.0"?><urlset><url><loc>https://health.zaleastudio.com/</loc></url><url><loc>https://health.zaleastudio.com/calculators/bmi/</loc></url></urlset>';

test('sitemap index resolves unique health-host URLs', async () => {
  const urls = await fetchSitemapUrls({ fetchImpl: async (url) => new Response(String(url).endsWith('sitemap-index.xml') ? sitemapIndex : sitemap, { status: 200 }) });
  assert.deepEqual(urls, ['https://health.zaleastudio.com/', 'https://health.zaleastudio.com/calculators/bmi/']);
});

test('external, query and fragment URLs are rejected', () => {
  assert.throws(() => normalizeIndexNowUrls(['https://zaleastudio.com/']), /must belong/u);
  assert.throws(() => normalizeIndexNowUrls(['https://health.zaleastudio.com/?x=1']), /canonical/u);
  assert.throws(() => normalizeIndexNowUrls(['https://health.zaleastudio.com/#x']), /canonical/u);
});

test('payload uses the separate health host and health key location', () => {
  assert.deepEqual(createIndexNowPayload(['https://health.zaleastudio.com/']), {
    host: INDEXNOW_HOST, key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: ['https://health.zaleastudio.com/'],
  });
});

test('live validator requires HTML 200, exact canonical and no noindex', async () => {
  const url = 'https://health.zaleastudio.com/calculators/bmi/';
  const valid = await validateLiveUrls([url], { sitemapUrls: [url], fetchImpl: async () => new Response(`<link rel="canonical" href="${url}">`, { status: 200, headers: { 'Content-Type': 'text/html' } }) });
  assert.deepEqual(valid.urls, [url]);
  const noindex = await validateLiveUrls([url], { sitemapUrls: [url], fetchImpl: async () => new Response(`<link rel="canonical" href="${url}"><meta name="robots" content="noindex">`, { status: 200, headers: { 'Content-Type': 'text/html' } }) });
  assert.equal(noindex.urls.length, 0);
  assert.match(noindex.skipped[0].reason, /noindex/u);
});

test('submission verifies the key and posts JSON to the global endpoint', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url) === INDEXNOW_KEY_LOCATION) return new Response(INDEXNOW_KEY, { status: 200 });
    return new Response('', { status: 200, statusText: 'OK' });
  };
  const result = await submitIndexNowUrls(['https://health.zaleastudio.com/'], { fetchImpl });
  assert.equal(calls[1].url, INDEXNOW_ENDPOINT);
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(JSON.parse(calls[1].init.body).host, INDEXNOW_HOST);
  assert.equal(result.status, 200);
});
