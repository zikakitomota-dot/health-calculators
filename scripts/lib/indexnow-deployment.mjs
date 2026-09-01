import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INDEXNOW_ORIGIN, fetchSitemapUrls, submitIndexNowUrls, validateLiveUrls } from './indexnow.mjs';

const execFileAsync = promisify(execFile);
const allPublicFiles = new Set([
  'src/layouts/BaseLayout.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/components/CookieConsent.astro',
  'src/styles/global.css',
]);
const allCalculatorFiles = new Set([
  'src/layouts/CalculatorLayout.astro',
  'src/components/BodyFields.astro',
  'src/components/AdSlot.astro',
  'src/data/calculators.ts',
  'src/scripts/dom.ts',
]);

function pagePathToUrl(file) {
  if (!file.startsWith('src/pages/') || !file.endsWith('.astro')) return null;
  let route = file.slice('src/pages/'.length, -'.astro'.length);
  if (route === 'index') route = '';
  else if (route.endsWith('/index')) route = route.slice(0, -'/index'.length);
  return new URL(`${route ? `/${route}` : ''}/`, INDEXNOW_ORIGIN).href;
}

function calculatorScriptToUrl(file) {
  const match = /^src\/scripts\/([^/]+)\.(?:js|ts)$/u.exec(file);
  if (!match || match[1] === 'dom') return null;
  return `${INDEXNOW_ORIGIN}/calculators/${match[1]}/`;
}

export function detectChangedUrlsFromFiles(files, sitemapUrls) {
  const normalized = [...new Set(files.map((file) => file.replaceAll('\\', '/')))];
  if (normalized.some((file) => allPublicFiles.has(file))) return [...new Set(sitemapUrls)].sort();
  const urls = new Set();
  if (normalized.some((file) => allCalculatorFiles.has(file))) {
    for (const url of sitemapUrls) if (new URL(url).pathname.startsWith('/calculators/')) urls.add(url);
  }
  for (const file of normalized) {
    const pageUrl = pagePathToUrl(file);
    if (pageUrl) urls.add(pageUrl);
    const scriptUrl = calculatorScriptToUrl(file);
    if (scriptUrl) urls.add(scriptUrl);
  }
  return [...urls].filter((url) => sitemapUrls.includes(url)).sort();
}

export async function changedFilesFromGit(base, head, { projectRoot = process.cwd() } = {}) {
  if (!base || !head || /^0+$/u.test(base)) return [];
  const { stdout } = await execFileAsync('git', ['diff', '--name-only', '--diff-filter=ACMRT', base, head], { cwd: projectRoot });
  return stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

export async function runAutomaticIndexNow({
  files,
  fetchImpl = globalThis.fetch,
  submitImpl = submitIndexNowUrls,
  log = console.log,
  errorLog = console.error,
  timestamp = new Date().toISOString(),
} = {}) {
  log(`[IndexNow] Successful production deployment timestamp: ${timestamp}`);
  const sitemapUrls = await fetchSitemapUrls({ fetchImpl });
  const detected = detectChangedUrlsFromFiles(files, sitemapUrls);
  log(`[IndexNow] Detected ${detected.length} changed public canonical URL${detected.length === 1 ? '' : 's'}.`);
  for (const url of detected) log(`[IndexNow] Detected URL: ${url}`);
  if (!detected.length) { log('[IndexNow] No public URL changed; no request was sent.'); return { detected, submitted: [], skipped: [], status: null }; }
  const validation = await validateLiveUrls(detected, { fetchImpl, sitemapUrls });
  for (const item of validation.skipped) errorLog(`[IndexNow] Skipped ${item.url}: ${item.reason}.`);
  if (!validation.urls.length) { log('[IndexNow] No detected URL passed live validation; no request was sent.'); return { detected, submitted: [], skipped: validation.skipped, status: null }; }
  log(`[IndexNow] Submitting ${validation.urls.length} URL${validation.urls.length === 1 ? '' : 's'}.`);
  for (const url of validation.urls) log(`[IndexNow] URL: ${url}`);
  const response = await submitImpl(validation.urls, { fetchImpl });
  log(`[IndexNow] HTTP response status: ${response.status} ${response.statusText}.`);
  log(`[IndexNow] Response body: ${response.responseBody?.trim() || '(empty)'}`);
  return { detected, submitted: validation.urls, skipped: validation.skipped, status: response.status };
}

export async function runAutomaticIndexNowFailOpen(options = {}) {
  try { return { ok: true, result: await runAutomaticIndexNow(options), error: null }; }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    (options.errorLog ?? console.error)(`[IndexNow] Post-deployment submission failed: ${message}`);
    (options.errorLog ?? console.error)('[IndexNow] The successful production deployment is unaffected; retry with the manual command if needed.');
    return { ok: false, result: null, error: message };
  }
}

export function findCloudflareProductionCheck(checkRuns) {
  return checkRuns.find((check) => check.name === 'Workers Builds: health-calculators') ?? null;
}

export async function waitForCloudflareProduction({
  repository,
  sha,
  token,
  fetchImpl = globalThis.fetch,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  attempts = 120,
  intervalMs = 5_000,
  log = console.log,
} = {}) {
  if (!repository || !sha || !token) throw new Error('GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_TOKEN are required.');
  const endpoint = `https://api.github.com/repos/${repository}/commits/${sha}/check-runs`;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchImpl(endpoint, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) throw new Error(`Could not read deployment checks: HTTP ${response.status} ${response.statusText}`);
    const check = findCloudflareProductionCheck((await response.json()).check_runs ?? []);
    if (check?.status === 'completed') {
      if (check.conclusion === 'success') { log(`[IndexNow] Cloudflare production deployment succeeded for ${sha}.`); return true; }
      log(`[IndexNow] Cloudflare production deployment concluded ${check.conclusion}; IndexNow was not run.`); return false;
    }
    if (attempt < attempts) await wait(intervalMs);
  }
  log('[IndexNow] Timed out waiting for the Cloudflare production deployment; IndexNow was not run.');
  return false;
}
