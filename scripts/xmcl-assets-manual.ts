import path from "node:path";
import fs from "node:fs";
import { parseVersion, installAssets, getMinecraftLocation } from "../src/minecraft/install.js";

// Test with isolated test-minecraft (same as before) and also demo with real instance path
const minecraftVersionId = "1.21.1";
const minecraftLocation = path.resolve("./test-minecraft");

console.log("=== Test 3 (via src/minecraft/install.ts): Install assets via native fetch ===");
console.log(`minecraftLocation: ${minecraftLocation} (isolated test)`);
console.log(`Demo instance location: ${getMinecraftLocation("demo-instance")} (how app will use it)`);
console.log(`version: ${minecraftVersionId}`);
console.log("");

const resolved = await parseVersion(minecraftLocation, minecraftVersionId);
if (!resolved.assetIndex) throw new Error("No assetIndex");
console.log(`Resolved assets: ${resolved.assets} (index ${resolved.assetIndex.id})`);
console.log(`  ${resolved.assetIndex.url.slice(0, 70)}...`);
console.log("");

const assetsIndexPath = path.join(minecraftLocation, "assets", "indexes", `${resolved.assets}.json`);
if (fs.existsSync(assetsIndexPath)) {
  const json = JSON.parse(fs.readFileSync(assetsIndexPath, "utf-8"));
  const count = Object.keys(json.objects).length;
  console.log(`Index cached: ${count} objects`);
}

console.log("Installing assets (20 concurrency, SHA1 verified, skip existing)...");
const start = Date.now();
const result = await installAssets(minecraftLocation, resolved, {
  concurrency: 20,
  onProgress: ({ done, total, name }) => {
    if (done % 100 === 0 || done === total) {
      const pct = ((done / total) * 100).toFixed(1);
      console.log(`  [${done}/${total} ${pct}%] ${name.slice(0, 60)}`);
    }
  },
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log("");
console.log("=== Done ===");
console.log(`Total: ${result.total}, Downloaded: ${result.downloaded}, Skipped: ${result.skipped}, Failed: ${result.failed.length}`);
console.log(`Bytes: ${(result.bytesDownloaded / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`);
if (result.failed.length) {
  for (const f of result.failed.slice(0, 5)) console.log(`  - ${f.name}: ${f.error}`);
}
console.log("");
console.log("Module ready for app: src/minecraft/install.ts");
console.log("  import { parseVersion, installAssets, getMinecraftLocation } from './minecraft/install.js'");
