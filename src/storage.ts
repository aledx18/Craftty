import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const APP_NAME = 'craftty';

/**
 * Carpeta de configuración de la app.
 * En desarrollo usa "craftty-dev" para no mezclar datos de prueba
 * con los reales. Solo Linux por ahora -> ~/.config/<carpeta>
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
 * Lee y parsea un JSON. Si no existe o está corrupto, devuelve el
 * valor por defecto en vez de tirar error (así la app arranca limpia
 * la primera vez, sin login, sin instancias, etc).
 * No loguea a stdout/stderr para no ensuciar la TUI (altScreen).
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
    // Silencioso: en TUI no queremos romper el render.
    // Si quisieras debug, escribe a un archivo de log en vez de console.error.
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
  } catch {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

// ---------- Tipos de dominio ----------

export type InstanceLoader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';
export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error';
export type JavaVersion = '8' | '11' | '17' | '21';

export const JAVA_VERSIONS: { value: JavaVersion; label: string }[] = [
  { value: '8', label: 'Java 8 (1.12 y anteriores)' },
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

// ---------- API pública: account ----------

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

// ---------- API pública: instances ----------

export function loadInstances(): Instance[] {
  return readJSON<Instance[]>('instances.json', []);
}

export function saveInstances(instances: Instance[]): void {
  writeJSON('instances.json', instances);
}

// ---------- API pública: settings ----------

export function loadSettings(): Settings {
  return readJSON<Settings>('settings.json', DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  writeJSON('settings.json', settings);
}

// ---------- Utilidad ----------

export function getConfigDirPath(): string {
  return getConfigDir();
}
