import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Version } from '@xmcl/core'

// Equivalent to your getInstancePath(id) + '/.minecraft'
// getInstancePath(id) = ~/.local/share/craftty-dev/instances/<id>
// minecraftLocation should be that + '/.minecraft' ? Actually @xmcl expects the ".minecraft" root itself.
// In our instanceFiles.ts we have getInstancePath(id) as the instance folder itself.
// For @xmcl the structure is: <minecraftLocation>/versions/<id>/<id>.json, libraries/, assets/, etc.
// So for us: minecraftLocation = path.join(getInstancePath(id), ".minecraft") OR simply getInstancePath(id) if we treat instance folder AS .minecraft
// For this isolated test we use ./test-minecraft as pure .minecraft root.

const minecraftVersionId = '1.21.1'
const minecraftLocation = path.resolve('./test-minecraft')

console.log('=== Test 1: Empty folder (should fail with MissingVersionJson) ===')
console.log(`minecraftLocation: ${minecraftLocation}`)
console.log(`minecraftVersionId: ${minecraftVersionId}`)
console.log(
  `Expected JSON path: ${path.join(minecraftLocation, 'versions', minecraftVersionId, `${minecraftVersionId}.json`)}`,
)
console.log('')

try {
  const resolved = await Version.parse(minecraftLocation, minecraftVersionId)
  console.log("UNEXPECTED success (empty folder shouldn't parse):", resolved)
} catch (e: any) {
  console.log(`Failed as expected: ${e.error ?? e.name ?? 'Error'}: ${e.message}`)
  if (e.error) console.log(`  error.code: ${e.error}`)
  if (e.path) console.log(`  error.path: ${e.path}`)
  if (e.version) console.log(`  error.version: ${e.version}`)
  console.log('')
}

console.log('=== Test 2: Fetch real version JSON from Mojang and parse ===')
// Mojang version manifest
const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
console.log(`Fetching manifest: ${manifestUrl}`)
const manifestRes = await fetch(manifestUrl)
if (!manifestRes.ok)
  throw new Error(`Manifest fetch failed: ${manifestRes.status} ${manifestRes.statusText}`)
const manifest = (await manifestRes.json()) as {
  versions: { id: string; url: string }[]
}
const entry = manifest.versions.find((v) => v.id === minecraftVersionId)
if (!entry) throw new Error(`Version ${minecraftVersionId} not found in manifest`)
console.log(`Found ${minecraftVersionId}: ${entry.url}`)

console.log(`Fetching version JSON: ${entry.url}`)
const versionRes = await fetch(entry.url)
if (!versionRes.ok) throw new Error(`Version JSON fetch failed: ${versionRes.status}`)
const versionJson = await versionRes.text() // keep as string for inspection

// Write to expected location: <minecraftLocation>/versions/1.21.1/1.21.1.json
const versionDir = path.join(minecraftLocation, 'versions', minecraftVersionId)
const versionJsonPath = path.join(versionDir, `${minecraftVersionId}.json`)
fs.mkdirSync(versionDir, { recursive: true })
fs.writeFileSync(versionJsonPath, versionJson, 'utf-8')
console.log(`Wrote ${versionJsonPath} (${(versionJson.length / 1024).toFixed(1)} KB)`)

// Also need to ensure other dirs exist for parse to make sense (libraries, assets)
// Version.parse doesn't require them to exist, but resolved paths will point there
console.log('')

try {
  const resolved = await Version.parse(minecraftLocation, minecraftVersionId)
  console.log('=== Parsed successfully! ===')
  console.log(`id: ${resolved.id}`)
  console.log(`minecraftVersion: ${resolved.minecraftVersion}`)
  console.log(`assets: ${resolved.assets}`)
  console.log(`mainClass: ${resolved.mainClass}`)
  console.log(`javaVersion: ${JSON.stringify(resolved.javaVersion)}`)
  console.log(`type: ${resolved.type}`)
  console.log(`minecraftDirectory: ${resolved.minecraftDirectory}`)
  console.log(`inheritances: ${JSON.stringify(resolved.inheritances)}`)
  console.log(`pathChain: ${JSON.stringify(resolved.pathChain)}`)
  console.log(`libraries: ${resolved.libraries.length} entries`)
  console.log(
    `  first 3: ${resolved.libraries
      .slice(0, 3)
      .map((l) => l.name)
      .join(', ')}`,
  )
  console.log(
    `downloads.client: ${resolved.downloads.client?.url ? 'present' : 'missing'} (${resolved.downloads.client?.url?.slice(0, 60)}...)`,
  )
  console.log(
    `assetIndex: ${resolved.assetIndex?.id} -> ${resolved.assetIndex?.url?.slice(0, 60)}...`,
  )
  console.log(`arguments.game: ${resolved.arguments.game.length} entries`)
  console.log(`arguments.jvm: ${resolved.arguments.jvm.length} entries`)
  console.log('')
  console.log('=== Mapping to your model ===')
  console.log(`Your Instance { id, version: "${minecraftVersionId}", folder: getInstancePath(id) }`)
  console.log(
    `  maps to Version.parse(path.join(getInstancePath(id), ".minecraft") OR simply getInstancePath(id) as minecraftLocation, version)`,
  )
  console.log(
    `  Example: Version.parse("${path.join(os.homedir(), '.local/share/craftty-dev/instances/my-instance')}", "${minecraftVersionId}")`,
  )
  console.log('')
  console.log('NOTE: This only parsed the JSON. It did NOT download libraries/assets/client jar.')
  console.log('That is the job of @xmcl/installer (next package to test).')
} catch (e: any) {
  console.error(`Parse failed even after fetching JSON: ${e.error ?? e.name}: ${e.message}`)
  if (e.path) console.error(`  path: ${e.path}`)
  console.error(e)
}
