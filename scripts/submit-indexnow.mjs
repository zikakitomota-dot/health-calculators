import {
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_SITEMAP_INDEX,
  fetchSitemapUrls,
  normalizeIndexNowUrls,
  submitIndexNowUrls,
  validateLiveUrls,
} from './lib/indexnow.mjs';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requested = args.filter((arg) => !arg.startsWith('-'));
  const unknown = args.filter((arg) => arg.startsWith('-') && arg !== '--dry-run');
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(', ')}`);

  const sitemapUrls = await fetchSitemapUrls();
  const candidates = requested.length ? normalizeIndexNowUrls(requested) : sitemapUrls;
  const validation = await validateLiveUrls(candidates, { sitemapUrls });
  console.log(`[IndexNow] Timestamp: ${new Date().toISOString()}`);
  console.log(`[IndexNow] Found ${sitemapUrls.length} public URL${sitemapUrls.length === 1 ? '' : 's'} in ${INDEXNOW_SITEMAP_INDEX}.`);
  console.log(`[IndexNow] Verified ${validation.urls.length} candidate URL${validation.urls.length === 1 ? '' : 's'}.`);
  for (const url of validation.urls) console.log(`[IndexNow] URL: ${url}`);
  for (const item of validation.skipped) console.error(`[IndexNow] Skipped ${item.url}: ${item.reason}.`);
  console.log(`[IndexNow] Key verification file: ${INDEXNOW_KEY_LOCATION}`);
  if (!validation.urls.length) { console.log('[IndexNow] No verified URLs; no request was sent.'); return; }
  if (dryRun) { console.log('[IndexNow] Dry run only; no request was sent.'); return; }
  const result = await submitIndexNowUrls(validation.urls);
  console.log(`[IndexNow] Submitted ${result.count} URL${result.count === 1 ? '' : 's'}; HTTP response status ${result.status} ${result.statusText}.`);
  console.log(`[IndexNow] Response body: ${result.responseBody.trim() || '(empty)'}`);
}

main().catch((error) => { console.error(`[IndexNow] ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
