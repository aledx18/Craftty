import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const APP_NAME = 'craftty';

/**
 * App configuration folder.
 * In development uses "craftty-dev" to keep test data separate from real data.
 * Linux only for now -> ~/.config/<folder>
 */
function getConfigDir(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const folderName = isDev ? `${APP_NAME}-dev` : APP_NAME;
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, folderName);
}

function ensureConfigDir(): void {
  fs.mkdirSync(getConfigDir(), { recursive: true });
}

function getFilePath(fileName: string): string {
  return path.join(getConfigDir(), fileName);
}

/**
 * Read and parse a JSON file. If it doesn't exist or is corrupted,
 * returns the default value instead of throwing (so the app starts clean
 * on first run — no login, no instances, etc).
 * Silently fails — we don't want to break the TUI (altScreen).
 */
function readJSON<T>(fileName: string, defaultValue: T): T {
  const filePath = getFilePath(fileName);

  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    // Silent: in a TUI we don't want to break the render.
    // If you need debug, write to a log file instead of console.error.
    return defaultValue;
  }
}

function writeJSON<T>(fileName: string, data: T): void {
  ensureConfigDir();
  const filePath = getFilePath(fileName);
  const tmpPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    // Callers must treat this as a failed persist — do not keep the new state.
    throw e;
  }
}

// ---------- Domain types ----------

export type InstanceLoader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';
export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error';
export type JavaVersion = '8' | '11' | '17' | '21';

export const JAVA_VERSIONS: { value: JavaVersion; label: string }[] = [
  { value: '8', label: 'Java 8 (1.12 and earlier)' },
  { value: '11', label: 'Java 11' },
  { value: '17', label: 'Java 17 (1.17 - 1.20.4)' },
  { value: '21', label: 'Java 21 (1.20.5+)' },
];

export interface Instance {
  id: string;
  name: string;
  version: string;
  loader: InstanceLoader;
  javaVersion?: JavaVersion;
  folder: string;
  playTime?: string;
  status?: InstanceStatus;
  createdAt: string;
}

export interface Account {
  username: string;
  uuid: string;
}

export interface Settings {
  memoryMinMB: number;
  memoryMaxMB: number;
}

const DEFAULT_SETTINGS: Settings = {
  memoryMinMB: 1024,
  memoryMaxMB: 4096,
};

// ---------- Public API: account ----------

export function loadAccount(): Account | null {
  return readJSON<Account | null>('account.json', null);
}

export function saveAccount(account: Account): void {
  writeJSON('account.json', account);
}

export function clearAccount(): void {
  const filePath = getFilePath('account.json');
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
}

// ---------- Public API: instances ----------

export function loadInstances(): Instance[] {
  const data = readJSON<unknown>('instances.json', []);
  return Array.isArray(data) ? (data as Instance[]) : [];
}

export function saveInstances(instances: Instance[]): void {
  writeJSON('instances.json', instances);
}

// ---------- Public API: settings ----------

export function loadSettings(): Settings {
  return readJSON<Settings>('settings.json', DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  writeJSON('settings.json', settings);
}

// ---------- Utilities ----------

export function getConfigDirPath(): string {
  return getConfigDir();
}
