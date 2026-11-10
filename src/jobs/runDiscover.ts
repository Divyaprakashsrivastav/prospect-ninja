import { runDailyDiscovery } from "@/jobs/discoverCampaigns";

async function main() {
  const results = await runDailyDiscovery();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
