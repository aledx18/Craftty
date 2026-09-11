import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { offlinePlayerUuid } from '@/src/minecraft/offlineUuid.js'

const APP_NAME = 'craftty'

/**
 * App configuration folder.
 * In development uses "craftty-dev" to keep test data separate from real data.
 * Linux only for now -> ~/.config/<folder>
 */
function getConfigDir(): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const folderName = isDev ? `${APP_NAME}-dev` : APP_NAME
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(base, folderName)
}

function ensureConfigDir(): void {
  fs.mkdirSync(getConfigDir(), { recursive: true })
}

function getFilePath(fileName: string): string {
  return path.join(getConfigDir(), fileName)
}

/**
 * Read and parse a JSON file. If it doesn't exist or is corrupted,
 * returns the default value instead of throwing (so the app starts clean
 * on first run — no login, no instances, etc).
 * Silently fails — we don't want to break the TUI (altScreen).
 */
function readJSON<T>(fileName: string, defaultValue: T): T {
  const filePath = getFilePath(fileName)

  if (!fs.existsSync(filePath)) {
    return defaultValue
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    // Silent: in a TUI we don't want to break the render.
    // If you need debug, write to a log file instead of console.error.
    return defaultValue
  }
}

function writeJSON<T>(fileName: string, data: T): void {
  ensureConfigDir()
  const filePath = getFilePath(fileName)
  const tmpPath = `${filePath}.tmp`

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tmpPath, filePath)
  } catch (e) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    } catch {}
    // Callers must treat this as a failed persist — do not keep the new state.
    throw e
  }
}

// ---------- Domain types ----------

export type InstanceLoader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge'
export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error'
export type JavaVersion = '8' | '11' | '17' | '21'

export const JAVA_VERSIONS: { value: JavaVersion; label: string }[] = [
  { value: '8', label: 'Java 8 (1.12 and earlier)' },
  { value: '11', label: 'Java 11' },
  { value: '17', label: 'Java 17 (1.17 - 1.20.4)' },
  { value: '21', label: 'Java 21 (1.20.5+)' },
]

export interface Instance {
  id: string
  name: string
  version: string
  loader: InstanceLoader
  javaVersion?: JavaVersion
  folder: string
  playTime?: string
  status?: InstanceStatus
  createdAt: string
}

/**
 * Discriminated account model.
 * Offline: UUID is always derived from username (vanilla OfflinePlayer rule).
 * Microsoft: UUID + tokens come from Xbox/Minecraft services — never recompute UUID.
 *
 * Legacy on disk: `{ username, uuid }` without `type` → migrated to offline on load.
 */
export type OfflineAccount = {
  type: 'offline'
  username: string
  uuid: string
}

export type MicrosoftAccount = {
  type: 'microsoft'
  username: string
  uuid: string
  accessToken: string
  refreshToken: string
  /** Epoch ms when accessToken should be considered expired. */
  expiresAt: number
}

export type Account = OfflineAccount | MicrosoftAccount

export interface Settings {
  memoryMinMB: number
  memoryMaxMB: number
}

const DEFAULT_SETTINGS: Settings = {
  memoryMinMB: 1024,
  memoryMaxMB: 4096,
}

// ---------- Account normalize / factories (pure) ----------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Accepts current or legacy account.json shapes.
 * Returns null if the payload is unusable.
 * For offline (and legacy), UUID is always recomputed from username.
 * For microsoft, all token fields are required — incomplete blobs are rejected.
 */
export function normalizeAccount(raw: unknown): Account | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!isNonEmptyString(o.username)) return null
  const username = o.username.trim()

  if (o.type === 'microsoft') {
    if (!isNonEmptyString(o.uuid)) return null
    if (!isNonEmptyString(o.accessToken)) return null
    if (!isNonEmptyString(o.refreshToken)) return null
    if (typeof o.expiresAt !== 'number' || !Number.isFinite(o.expiresAt)) return null
    return {
      type: 'microsoft',
      username,
      uuid: o.uuid.trim(),
      accessToken: o.accessToken,
      refreshToken: o.refreshToken,
      expiresAt: o.expiresAt,
    }
  }

  // offline | legacy (no type) → offline. Unknown type is rejected.
  if (o.type != null && o.type !== 'offline') return null
  return createOfflineAccount(username)
}

export function createOfflineAccount(username: string): OfflineAccount {
  const name = username.trim()
  return {
    type: 'offline',
    username: name,
    uuid: offlinePlayerUuid(name),
  }
}

// ---------- Public API: account ----------

export function loadAccount(): Account | null {
  const raw = readJSON<unknown>('account.json', null)
  if (raw == null) return null

  const normalized = normalizeAccount(raw)
  if (!normalized) return null

  // Persist migration (legacy → typed offline, or fixed offline uuid).
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    try {
      saveAccount(normalized)
    } catch {
      // In-memory normalized account is still returned.
    }
  }
  return normalized
}

export function saveAccount(account: Account): void {
  writeJSON('account.json', account)
}

export function clearAccount(): void {
  const filePath = getFilePath('account.json')
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch {}
  }
}

// ---------- Public API: instances ----------

export function loadInstances(): Instance[] {
  const data = readJSON<unknown>('instances.json', [])
  return Array.isArray(data) ? (data as Instance[]) : []
}

export function saveInstances(instances: Instance[]): void {
  writeJSON('instances.json', instances)
}

/**
 * Runtime-only statuses cannot survive a craftty restart:
 * - playing: child handle is gone (game may still run detached)
 * - updating: install job is gone
 * Call on load and on process exit so badges never stick forever.
 */
export function normalizeEphemeralStatus(status: InstanceStatus | undefined): InstanceStatus {
  if (status === 'playing') return 'ready'
  if (status === 'updating') return 'error'
  return status ?? 'ready'
}

export function clearEphemeralInstanceStatuses(): void {
  try {
    const list = loadInstances()
    let changed = false
    const next = list.map((inst) => {
      const status = normalizeEphemeralStatus(inst.status)
      if (status !== inst.status) {
        changed = true
        return { ...inst, status }
      }
      return inst
    })
    if (changed) saveInstances(next)
  } catch {
    // Never block process exit on a bad write.
  }
}

// ---------- Public API: settings ----------

export function loadSettings(): Settings {
  return readJSON<Settings>('settings.json', DEFAULT_SETTINGS)
}

export function saveSettings(settings: Settings): void {
  writeJSON('settings.json', settings)
}

// ---------- Utilities ----------

export function getConfigDirPath(): string {
  return getConfigDir()
}
