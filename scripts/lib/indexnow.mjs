export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const INDEXNOW_ORIGIN = 'https://health.zaleastudio.com';
export const INDEXNOW_HOST = 'health.zaleastudio.com';
export const INDEXNOW_KEY = 'c7e3cbc8412d9fc7c656069a70729e4682e0b72b9163cdac57982c831fded78e';
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_SITEMAP_INDEX = `${INDEXNOW_ORIGIN}/sitemap-index.xml`;
export const INDEXNOW_MAX_URLS = 10_000;

const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

export function validateIndexNowKey(key = INDEXNOW_KEY) {
  if (!KEY_PATTERN.test(key)) throw new Error('The IndexNow key must contain 8–128 letters, numbers or hyphens.');
  return key;
}

export function normalizeIndexNowUrls(urls) {
  if (!Array.isArray(urls)) throw new TypeError('IndexNow URLs must be provided as an array.');
  const uniqueUrls = [];
  const seen = new Set();
  for (const value of urls) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('IndexNow URLs must be non-empty strings.');
    let url;
    try { url = new URL(value.trim()); } catch { throw new Error(`Invalid IndexNow URL: ${value}`); }
    if (url.origin !== INDEXNOW_ORIGIN || url.hostname !== INDEXNOW_HOST) {
      throw new Error(`IndexNow URL must belong to ${INDEXNOW_ORIGIN}: ${value}`);
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error(`IndexNow URL must be canonical and contain no credentials, query string or fragment: ${value}`);
    }
    if (!seen.has(url.href)) {
      seen.add(url.href);
      uniqueUrls.push(url.href);
    }
  }
  if (!uniqueUrls.length) throw new Error('At least one IndexNow URL is required.');
  if (uniqueUrls.length > INDEXNOW_MAX_URLS) throw new Error(`IndexNow accepts at most ${INDEXNOW_MAX_URLS} URLs per request.`);
  return uniqueUrls;
}

function decodeXmlText(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'");
}

export function parseXmlLocations(xml) {
  if (typeof xml !== 'string' || !xml.trim()) throw new Error('The sitemap response is empty.');
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/giu)].map((match) => decodeXmlText(match[1].trim()));
}

async function fetchXml(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { Accept: 'application/xml, text/xml;q=0.9, */*;q=0.1' } });
  if (!response.ok) throw new Error(`Could not read ${url}: HTTP ${response.status} ${response.statusText}`);
  return response.text();
}

export async function fetchSitemapUrls({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A Fetch-compatible implementation is required.');
  const indexLocations = parseXmlLocations(await fetchXml(INDEXNOW_SITEMAP_INDEX, fetchImpl));
  const sitemapUrls = indexLocations.filter((value) => {
    try {
      const url = new URL(value);
      return url.origin === INDEXNOW_ORIGIN && /^\/sitemap-[^/]+\.xml$/u.test(url.pathname);
    } catch { return false; }
  });
  if (!sitemapUrls.length) throw new Error('The health sitemap index contains no supported child sitemap.');
  const pageLocations = [];
  for (const sitemapUrl of sitemapUrls) pageLocations.push(...parseXmlLocations(await fetchXml(sitemapUrl, fetchImpl)));
  return normalizeIndexNowUrls(pageLocations);
}

function tagAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(['"])(.*?)\2/gu)) attributes[match[1].toLowerCase()] = match[3];
  return attributes;
}

function canonicalFromHtml(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/giu)) {
    const attributes = tagAttributes(match[0]);
    if ((attributes.rel ?? '').toLowerCase().split(/\s+/u).includes('canonical')) return attributes.href ?? null;
  }
  return null;
}

function hasNoIndex(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const attributes = tagAttributes(match[0]);
    if (!['robots', 'googlebot', 'bingbot'].includes((attributes.name ?? '').toLowerCase())) continue;
    if ((attributes.content ?? '').toLowerCase().split(/[\s,]+/u).includes('noindex')) return true;
  }
  return false;
}

export async function validateLiveUrls(urls, { fetchImpl = globalThis.fetch, sitemapUrls } = {}) {
  const listedUrls = sitemapUrls ?? await fetchSitemapUrls({ fetchImpl });
  const sitemapSet = new Set(listedUrls);
  const accepted = [];
  const skipped = [];
  for (const url of [...new Set(urls)]) {
    if (!sitemapSet.has(url)) { skipped.push({ url, reason: 'not present in the live sitemap' }); continue; }
    const response = await fetchImpl(url, { redirect: 'manual', headers: { Accept: 'text/html' } });
    if (response.status >= 300 && response.status < 400) { skipped.push({ url, reason: `redirected with HTTP ${response.status}` }); continue; }
    if (response.status !== 200) { skipped.push({ url, reason: `returned HTTP ${response.status} ${response.statusText}`.trim() }); continue; }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('text/html')) { skipped.push({ url, reason: `served non-HTML content type ${contentType || '(missing)'}` }); continue; }
    const html = await response.text();
    const canonical = canonicalFromHtml(html);
    if (!canonical || new URL(canonical, url).href !== url) { skipped.push({ url, reason: 'canonical link does not exactly match' }); continue; }
    if (hasNoIndex(html)) { skipped.push({ url, reason: 'declares noindex' }); continue; }
    accepted.push(url);
  }
  return { urls: accepted, skipped };
}

export function createIndexNowPayload(urls, { key = INDEXNOW_KEY } = {}) {
  validateIndexNowKey(key);
  return { host: INDEXNOW_HOST, key, keyLocation: `${INDEXNOW_ORIGIN}/${key}.txt`, urlList: normalizeIndexNowUrls(urls) };
}

export async function verifyKeyFile({ fetchImpl = globalThis.fetch, key = INDEXNOW_KEY } = {}) {
  const response = await fetchImpl(`${INDEXNOW_ORIGIN}/${key}.txt`, { redirect: 'manual' });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`IndexNow key file returned HTTP ${response.status} ${response.statusText}.`);
  if (body.trim() !== key) throw new Error('IndexNow key file content does not exactly match the configured key.');
  return { status: response.status, body };
}

export async function submitIndexNowUrls(urls, { fetchImpl = globalThis.fetch, key = INDEXNOW_KEY } = {}) {
  await verifyKeyFile({ fetchImpl, key });
  const payload = createIndexNowPayload(urls, { key });
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const responseBody = await response.text();
  if (!response.ok) {
    const detail = responseBody.trim() ? `: ${responseBody.trim().slice(0, 500)}` : '';
    throw new Error(`IndexNow rejected ${payload.urlList.length} URLs with HTTP ${response.status} ${response.statusText}${detail}`);
  }
  return { count: payload.urlList.length, status: response.status, statusText: response.statusText, responseBody };
}
