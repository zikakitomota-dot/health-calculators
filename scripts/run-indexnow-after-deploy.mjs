import { changedFilesFromGit, runAutomaticIndexNowFailOpen, waitForCloudflareProduction } from './lib/indexnow-deployment.mjs';

async function main() {
  const deployed = await waitForCloudflareProduction({
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    token: process.env.GITHUB_TOKEN,
  });
  if (!deployed) return;
  const files = await changedFilesFromGit(process.env.INDEXNOW_BASE_SHA, process.env.GITHUB_SHA);
  console.log(`[IndexNow] Deployment diff contains ${files.length} changed file${files.length === 1 ? '' : 's'}.`);
  for (const file of files) console.log(`[IndexNow] Changed file: ${file}`);
  await runAutomaticIndexNowFailOpen({ files, timestamp: new Date().toISOString() });
}

main().catch((error) => {
  console.error(`[IndexNow] Post-deployment observer failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error('[IndexNow] The successful production deployment is unaffected.');
});
