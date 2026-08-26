import crypto from 'node:crypto'
import fs, { createWriteStream } from 'node:fs'
import path, { basename, dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { ResolvedVersion } from '@xmcl/core'
import { Version } from '@xmcl/core'
import { open, openEntryReadStream, walkEntriesGenerator } from '@xmcl/unzip'
import { ensureSharedPath } from '@/src/instanceFiles.js'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const DEFAULT_ASSETS_HOST = 'https://resources.download.minecraft.net'
const FETCH_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 500

/**
 * Whether an error from fetch/download is worth retrying.
 * - HTTP 5xx (server errors): retryable
 * - HTTP 4xx (client errors like 404): NOT retryable, the resource doesn't exist
 * - Network errors, timeouts, ECONNRESET: retryable
 * - SHA1 mismatch: NOT retryable (corrupt server response, retrying won't fix it)
 */
function isAbortError(e: any): boolean {
  return e?.name === 'AbortError' || e?.message === 'Download cancelled'
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const err = new Error('Download cancelled')
    err.name = 'AbortError'
    throw err
  }
}

function isRetryableError(e: any, httpStatus?: number): boolean {
  if (isAbortError(e)) return false
  if (httpStatus !== undefined) {
    return httpStatus >= 500 && httpStatus < 600
  }
  // Network-level error (no status)
  const code = e?.cause?.code ?? e?.code
  if (code && /^(ECONNRESET|ETIMEDOUT|EPROTO|ENOTFOUND|EAI_AGAIN|ECONNREFUSED)$/.test(code)) {
    return true
  }
  // SHA1 mismatches are not retryable (would just fail again)
  if (e?.message && /SHA1 mismatch/.test(e.message)) return false
  // Default: retryable (catches AbortError/timeout, generic network blips)
  return true
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const timeout = new AbortController()
  const id = setTimeout(() => timeout.abort(), FETCH_TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout.signal]) : timeout.signal
  try {
    const res = await fetch(url, { ...init, signal })
    return res
  } catch (e: any) {
    if (e.name === 'AbortError') {
      if (init.signal?.aborted) {
        const err = new Error('Download cancelled')
        err.name = 'AbortError'
        throw err
      }
      throw new Error(`Network timeout after ${FETCH_TIMEOUT_MS / 1000}s for ${url}`)
    }
    throw e
  } finally {
    clearTimeout(id)
  }
}

/**
 * Wrap a download attempt with up to MAX_RETRIES retries and linear backoff.
 * Caller passes a `tryOnce` function that either returns successfully or throws.
 * If `isRetryableError` returns false (e.g. SHA1 mismatch, HTTP 404), retries are skipped.
 */
async function withRetry<T>(
  label: string,
  tryOnce: () => Promise<T>,
  lastHttpStatus?: { value?: number },
): Promise<T> {
  let lastErr: any
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await tryOnce()
    } catch (e: any) {
      lastErr = e
      const status = lastHttpStatus?.value
      if (!isRetryableError(e, status) || attempt === MAX_RETRIES) {
        throw e
      }
      // Linear backoff: 500ms, 1000ms, 1500ms...
      const delay = RETRY_BASE_DELAY_MS * attempt
      await sleep(delay)
    }
  }
  throw lastErr
}

/**
 * Shared Minecraft root (assets, libraries, versions).
 * Instance folders are only gamePath (saves, options, screenshots).
 */
export function getMinecraftLocation(_instanceId?: string): string {
  return ensureSharedPath()
}

export function getSharedMinecraftLocation(): string {
  return ensureSharedPath()
}

/**
 * Ensure version JSON exists at <minecraftLocation>/versions/<id>/<id>.json
 * If missing, fetches it from Mojang manifest and writes it.
 * Returns the path to the JSON.
 */
export async function ensureVersionJson(
  minecraftLocation: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<string> {
  const versionJsonPath = path.join(minecraftLocation, 'versions', versionId, `${versionId}.json`)
  if (fs.existsSync(versionJsonPath)) return versionJsonPath

  const manifest = (await fetchWithTimeout(MANIFEST_URL, { signal }).then((r) => {
    if (!r.ok) throw new Error(`Manifest fetch failed: ${r.status}`)
    return r.json()
  })) as { versions: { id: string; url: string }[] }

  const entry = manifest.versions.find((v) => v.id === versionId)
  if (!entry) throw new Error(`Version ${versionId} not found in manifest`)

  const json = await fetchWithTimeout(entry.url, { signal }).then((r) => {
    if (!r.ok) throw new Error(`Version JSON fetch failed: ${r.status}`)
    return r.text()
  })

  fs.mkdirSync(path.dirname(versionJsonPath), { recursive: true })
  fs.writeFileSync(versionJsonPath, json, 'utf-8')
  return versionJsonPath
}

/**
 * Parse and resolve a Minecraft version.
 * Ensures the JSON exists first (fetches if needed).
 */
export async function parseVersion(
  minecraftLocation: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<ResolvedVersion> {
  await ensureVersionJson(minecraftLocation, versionId, signal)
  return Version.parse(minecraftLocation, versionId)
}

export interface AvailableVersion {
  id: string
  url: string
  type: string
  releaseTime: string
  time: string
}

/**
 * Fetch available Minecraft versions (released only).
 * Uses version_manifest_v2.json and filters type === 'release'.
 */
export async function fetchReleasedVersions(): Promise<AvailableVersion[]> {
  const manifest = (await fetchWithTimeout(MANIFEST_URL).then((r) => {
    if (!r.ok) throw new Error(`Manifest fetch failed: ${r.status}`)
    return r.json()
  })) as { versions: AvailableVersion[] }
  return manifest.versions.filter((v) => v.type === 'release')
}

export interface InstallAssetsOptions {
  /** Parallel downloads (default 10) */
  concurrency?: number
  /** Assets host override (default https://resources.download.minecraft.net) */
  assetsHost?: string
  signal?: AbortSignal
  /** Progress callback per completed asset (after retries exhausted) */
  onProgress?: (progress: {
    done: number // attempts completed (success + failed)
    total: number // total files to process
    downloaded: number // successfully downloaded
    failed: number // failed after all retries
    name: string // current file name
    bytes: number // total bytes downloaded so far
  }) => void
}

export interface InstallAssetsResult {
  total: number
  downloaded: number
  skipped: number
  failed: { name: string; hash: string; error: string }[]
  bytesDownloaded: number
  totalBytes: number
}

/**
 * Install assets for a resolved version.
 * Downloads assets/indexes/<assets>.json if missing, then all objects in assets/objects/<hash>.
 * Validates SHA1, skips existing correct files, supports concurrency.
 * This is the manual implementation that replaces Installer.installAssets (which has a bug in 2.9.8).
 */
export async function installAssets(
  minecraftLocation: string,
  version: ResolvedVersion,
  options: InstallAssetsOptions = {},
): Promise<InstallAssetsResult> {
  const concurrency = options.concurrency ?? 10
  const assetsHost = options.assetsHost ?? DEFAULT_ASSETS_HOST
  const onProgress = options.onProgress
  const signal = options.signal

  const assetsIndexPath = path.join(
    minecraftLocation,
    'assets',
    'indexes',
    `${version.assets}.json`,
  )
  const assetsObjectsDir = path.join(minecraftLocation, 'assets', 'objects')

  // Ensure index exists
  if (!fs.existsSync(assetsIndexPath)) {
    if (!version.assetIndex) throw new Error(`No assetIndex for version ${version.id}`)
    const buf = Buffer.from(
      (await fetchWithTimeout(version.assetIndex.url, { signal }).then((r) => {
        if (!r.ok) throw new Error(`Asset index fetch failed: ${r.status}`)
        return r.arrayBuffer()
      })) as any,
    )
    const sha1 = crypto.createHash('sha1').update(buf).digest('hex')
    if (sha1 !== version.assetIndex.sha1) {
      throw new Error(`Asset index SHA1 mismatch: expected ${version.assetIndex.sha1}, got ${sha1}`)
    }
    fs.mkdirSync(path.dirname(assetsIndexPath), { recursive: true })
    fs.writeFileSync(assetsIndexPath, buf)
  }

  const indexJson = JSON.parse(fs.readFileSync(assetsIndexPath, 'utf-8'))
  const objects = indexJson.objects as Record<string, { hash: string; size: number }>
  const entries = Object.entries(objects).map(([name, { hash, size }]) => ({ name, hash, size }))
  const totalBytes = entries.reduce((a, b) => a + b.size, 0)

  // Find missing (skip if file exists with correct size + sha1)
  const missing: typeof entries = []
  let skipped = 0
  for (const e of entries) {
    const p = path.join(assetsObjectsDir, e.hash.slice(0, 2), e.hash)
    if (fs.existsSync(p)) {
      try {
        const data = fs.readFileSync(p)
        if (data.length === e.size) {
          const sha1 = crypto.createHash('sha1').update(data).digest('hex')
          if (sha1 === e.hash) {
            skipped++
            continue
          }
        }
      } catch {}
    }
    missing.push(e)
  }

  if (missing.length === 0) {
    return {
      total: entries.length,
      downloaded: 0,
      skipped,
      failed: [],
      bytesDownloaded: 0,
      totalBytes,
    }
  }

  let done = 0
  let downloaded = 0
  let bytesDownloaded = 0
  const failed: InstallAssetsResult['failed'] = []
  let idx = 0

  async function downloadOne(entry: (typeof entries)[number]) {
    const { name, hash, size } = entry
    const head = hash.slice(0, 2)
    const dir = path.join(assetsObjectsDir, head)
    const dest = path.join(dir, hash)
    const url = `${assetsHost}/${head}/${hash}`

    // Re-check if exists (race after initial scan)
    if (fs.existsSync(dest)) {
      try {
        const data = fs.readFileSync(dest)
        if (data.length === size) {
          const sha1 = crypto.createHash('sha1').update(data).digest('hex')
          if (sha1 === hash) return
        }
      } catch {}
    }

    fs.mkdirSync(dir, { recursive: true })
    const res = await fetchWithTimeout(url, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const buf = Buffer.from((await res.arrayBuffer()) as any)
    const sha1 = crypto.createHash('sha1').update(buf).digest('hex')
    if (sha1 !== hash) throw new Error(`SHA1 mismatch: expected ${hash}, got ${sha1}`)
    fs.writeFileSync(dest, buf)
    bytesDownloaded += buf.length
  }

  async function worker() {
    while (idx < missing.length) {
      throwIfAborted(signal)
      const i = idx++
      const entry = missing[i]!
      try {
        await withRetry(entry.name, () => downloadOne(entry))
        downloaded++
      } catch (e: any) {
        if (isAbortError(e)) throw e
        failed.push({ name: entry.name, hash: entry.hash, error: e.message })
      } finally {
        done++
        onProgress?.({
          done,
          total: missing.length,
          downloaded,
          failed: failed.length,
          name: entry.name,
          bytes: bytesDownloaded,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, missing.length) }, () => worker()))

  return {
    total: entries.length,
    downloaded,
    skipped,
    failed,
    bytesDownloaded,
    totalBytes,
  }
}

export interface InstallLibrariesOptions {
  concurrency?: number
  signal?: AbortSignal
  onProgress?: (progress: {
    done: number
    total: number
    downloaded: number
    failed: number
    name: string
  }) => void
}

export interface InstallLibrariesResult {
  total: number
  downloaded: number
  skipped: number
  failed: { name: string; error: string }[]
}

export async function installLibraries(
  minecraftLocation: string,
  version: ResolvedVersion,
  options: InstallLibrariesOptions = {},
): Promise<InstallLibrariesResult> {
  const concurrency = options.concurrency ?? 10
  const onProgress = options.onProgress
  const signal = options.signal
  const libs = version.libraries

  // Find missing
  const missing: typeof libs = []
  let skipped = 0
  for (const lib of libs) {
    const dest = path.join(minecraftLocation, 'libraries', lib.download.path)
    if (fs.existsSync(dest)) {
      try {
        const data = fs.readFileSync(dest)
        // Size check if available, else just sha1
        const sha1 = crypto.createHash('sha1').update(data).digest('hex')
        if (sha1 === lib.download.sha1) {
          skipped++
          continue
        }
      } catch {}
    }
    missing.push(lib)
  }

  if (missing.length === 0) {
    try {
      await extractNatives(minecraftLocation, version)
    } catch (e: any) {
      console.warn(`Failed to extract natives: ${e.message}`)
    }
    return { total: libs.length, downloaded: 0, skipped, failed: [] }
  }

  let done = 0
  let downloaded = 0
  const failed: InstallLibrariesResult['failed'] = []
  let idx = 0

  async function downloadOne(lib: (typeof libs)[number]) {
    const dest = path.join(minecraftLocation, 'libraries', lib.download.path)
    if (fs.existsSync(dest)) {
      try {
        const data = fs.readFileSync(dest)
        const sha1 = crypto.createHash('sha1').update(data).digest('hex')
        if (sha1 === lib.download.sha1) return
      } catch {}
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const res = await fetchWithTimeout(lib.download.url, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${lib.name}`)
    const buf = Buffer.from((await res.arrayBuffer()) as any)
    const sha1 = crypto.createHash('sha1').update(buf).digest('hex')
    if (lib.download.sha1 && sha1 !== lib.download.sha1)
      throw new Error(`SHA1 mismatch for ${lib.name}`)
    fs.writeFileSync(dest, buf)
  }

  async function worker() {
    while (idx < missing.length) {
      throwIfAborted(signal)
      const i = idx++
      const lib = missing[i]!
      try {
        await withRetry(lib.name, () => downloadOne(lib))
        downloaded++
      } catch (e: any) {
        if (isAbortError(e)) throw e
        failed.push({ name: lib.name, error: e.message })
      } finally {
        done++
        onProgress?.({
          done,
          total: missing.length,
          downloaded,
          failed: failed.length,
          name: lib.name,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, missing.length) }, () => worker()))

  // Extract natives for relevant libraries
  try {
    await extractNatives(minecraftLocation, version)
  } catch (e: any) {
    // Don't fail whole install if natives extraction fails — report but continue
    // The launch will fail later if natives are missing, but download succeeded
    console.warn(`Failed to extract natives: ${e.message}`)
  }

  return { total: libs.length, downloaded, skipped, failed }
}

async function extractNatives(minecraftLocation: string, version: ResolvedVersion) {
  const natives = version.libraries.filter(
    (lib) => lib.isNative || lib.download.path.includes('natives'),
  )
  if (natives.length === 0) return

  const nativesRoot = join(minecraftLocation, 'versions', version.id, `${version.id}-natives`)
  await fs.promises.mkdir(nativesRoot, { recursive: true })

  for (const lib of natives) {
    const jarPath = join(minecraftLocation, 'libraries', lib.download.path)
    if (!fs.existsSync(jarPath)) continue // Skip if jar missing (should not happen)

    // Validate SHA1 of the native jar before opening — corrupt jars get skipped
    // instead of producing half-broken natives via a partial extraction.
    try {
      const data = await fs.promises.readFile(jarPath)
      const sha1 = crypto.createHash('sha1').update(data).digest('hex')
      if (lib.download.sha1 && sha1 !== lib.download.sha1) {
        console.warn(
          `Native jar SHA1 mismatch, skipping extract: ${lib.name} (expected ${lib.download.sha1}, got ${sha1})`,
        )
        continue
      }
    } catch {
      continue
    }

    const excluded = lib.extractExclude || []
    const shouldExclude = (p: string) => excluded.some((s) => p.startsWith(s))
    const isMetaInf = (p: string) => p.startsWith('META-INF/')
    const isSha1OrGit = (p: string) => p.endsWith('.sha1') || p.endsWith('.git')

    let zip: Awaited<ReturnType<typeof open>> | undefined
    try {
      zip = await open(jarPath, { lazyEntries: true })
    } catch {
      continue
    }

    const promises: Promise<void>[] = []
    for await (const entry of walkEntriesGenerator(zip)) {
      const name = entry.fileName
      if (name.endsWith('/')) continue
      if (shouldExclude(name)) continue
      if (isMetaInf(name)) continue
      if (isSha1OrGit(name)) continue

      const fileName = basename(name)
      const dest = join(nativesRoot, fileName)
      // Handle entries with subfolders like "linux/x64/lib.so" — we flatten to basename as per vanilla
      // but ensure parent dir exists
      await fs.promises.mkdir(dirname(dest), { recursive: true }).catch(() => {})

      const readStream = await openEntryReadStream(zip, entry)
      const writeStream = createWriteStream(dest)
      promises.push(pipeline(readStream, writeStream as any) as Promise<void>)
    }
    await Promise.all(promises)
    // Close zip file (yauzl autoClose false, need to close)
    try {
      ;(zip as any).close?.()
    } catch {}
  }
}

export interface InstallClientResult {
  skipped: boolean
  failed?: string
  bytes: number
}

export async function installClientJar(
  minecraftLocation: string,
  version: ResolvedVersion,
  options: { onProgress?: (bytes: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<InstallClientResult> {
  const client = version.downloads.client
  if (!client) throw new Error('No client download in version')
  const dest = path.join(minecraftLocation, 'versions', version.id, `${version.id}.jar`)
  if (fs.existsSync(dest)) {
    try {
      const data = fs.readFileSync(dest)
      if (data.length === client.size) {
        const sha1 = crypto.createHash('sha1').update(data).digest('hex')
        if (sha1 === client.sha1) return { skipped: true, bytes: data.length }
      }
    } catch {}
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })

  await withRetry(`${version.id}.jar`, async () => {
    const res = await fetchWithTimeout(client.url, { signal: options.signal })
    if (!res.ok) throw new Error(`Client jar fetch failed: ${res.status}`)
    const buf = Buffer.from((await res.arrayBuffer()) as any)
    const sha1 = crypto.createHash('sha1').update(buf).digest('hex')
    if (sha1 !== client.sha1) throw new Error(`Client jar SHA1 mismatch`)
    fs.writeFileSync(dest, buf)
    options.onProgress?.(buf.length, client.size)
  })

  const data = fs.readFileSync(dest)
  return { skipped: false, bytes: data.length }
}

export type InstallPhase =
  | 'validating'
  | 'downloading-assets'
  | 'downloading-libraries'
  | 'downloading-client'

export interface InstallVanillaProgress {
  phase: InstallPhase
  done: number
  total: number
  downloaded: number
  failed: number
  bytesDownloaded?: number
  totalBytes?: number
}

/**
 * Full vanilla install into a Minecraft root (usually the shared store).
 * Existing correct files are skipped. Used by create and by play-repair.
 */
export async function installVanilla(
  minecraftLocation: string,
  versionId: string,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: InstallVanillaProgress) => void
  } = {},
): Promise<ResolvedVersion> {
  const { signal, onProgress } = options

  onProgress?.({ phase: 'validating', done: 0, total: 1, downloaded: 0, failed: 0 })
  const resolved = await parseVersion(minecraftLocation, versionId, signal)

  onProgress?.({
    phase: 'downloading-assets',
    done: 0,
    total: 1,
    downloaded: 0,
    failed: 0,
    bytesDownloaded: 0,
    totalBytes: resolved.assetIndex?.totalSize ?? 0,
  })
  const assets = await installAssets(minecraftLocation, resolved, {
    concurrency: 10,
    signal,
    onProgress: (p) => {
      onProgress?.({
        phase: 'downloading-assets',
        done: p.done,
        total: p.total,
        downloaded: p.downloaded,
        failed: p.failed,
        bytesDownloaded: p.bytes,
        totalBytes: resolved.assetIndex?.totalSize ?? 0,
      })
    },
  })
  if (assets.failed.length > 0) {
    throw new Error(`Failed to download ${assets.failed.length}/${assets.total} assets`)
  }

  onProgress?.({
    phase: 'downloading-libraries',
    done: 0,
    total: resolved.libraries.length,
    downloaded: 0,
    failed: 0,
  })
  const libs = await installLibraries(minecraftLocation, resolved, {
    concurrency: 10,
    signal,
    onProgress: (p) => {
      onProgress?.({
        phase: 'downloading-libraries',
        done: p.done,
        total: p.total,
        downloaded: p.downloaded,
        failed: p.failed,
      })
    },
  })
  if (libs.failed.length > 0) {
    throw new Error(`Failed to download ${libs.failed.length}/${libs.total} libraries`)
  }

  onProgress?.({
    phase: 'downloading-client',
    done: 0,
    total: 1,
    downloaded: 0,
    failed: 0,
    bytesDownloaded: 0,
    totalBytes: resolved.downloads.client?.size ?? 0,
  })
  await installClientJar(minecraftLocation, resolved, {
    signal,
    onProgress: (bytes, total) => {
      onProgress?.({
        phase: 'downloading-client',
        done: 1,
        total: 1,
        downloaded: 1,
        failed: 0,
        bytesDownloaded: bytes,
        totalBytes: total,
      })
    },
  })

  return resolved
}
