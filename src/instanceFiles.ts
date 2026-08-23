import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const APP_NAME = 'craftty';

function getDataDir(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const folderName = isDev ? `${APP_NAME}-dev` : APP_NAME;
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, folderName);
}

export function getInstancesDir(): string {
  return path.join(getDataDir(), 'instances');
}

export function getInstancePath(id: string): string {
  return path.join(getInstancesDir(), id);
}

export function ensureInstanceFolder(id: string): string {
  const p = getInstancePath(id);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

export function removeInstanceFolder(id: string): void {
  const p = getInstancePath(id);
  fs.rmSync(p, { recursive: true, force: true });
}

export function getInstanceFolderSize(id: string): number {
  const p = getInstancePath(id);
  if (!fs.existsSync(p)) return 0;
  let total = 0;
  const stack: string[] = [p];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {}
      }
    }
  }
  return total;
}

export function copyJarToInstance(jarPath: string, instanceId: string): string {
  const destDir = ensureInstanceFolder(instanceId);
  const dest = path.join(destDir, path.basename(jarPath));
  fs.copyFileSync(jarPath, dest);
  return dest;
}

export function getDataDirPath(): string {
  return getDataDir();
}
