import { useState, useCallback } from 'react';
import fs from 'node:fs';
import { loadInstances, saveInstances } from '../storage.js';
import { removeInstanceFolder, getInstancesDir } from '../instanceFiles.js';
import type { Instance } from '../storage.js';

interface LegacyInstance {
  id: string;
  name: string;
  version: string;
  loader?: string;
  folder: string;
  javaVersion?: string;
  status?: string;
  playTime?: string;
  createdAt?: string;
}

export function useInstances() {
  const [instances, setInstances] = useState<Instance[]>(() => {
    const loaded = (loadInstances() as unknown as LegacyInstance[]).map(
      (inst): Instance => {
        // Migration: relative folder -> absolute + ensure folder exists
        const absFolder = inst.folder.startsWith('/') ? inst.folder : `${getInstancesDir()}/${inst.folder}`;
        try { fs.mkdirSync(absFolder, { recursive: true }); } catch {}
        return {
          id: inst.id,
          name: inst.name,
          version: inst.version,
          loader: (inst.loader as Instance['loader']) ?? 'vanilla',
          folder: absFolder,
          javaVersion: (inst.javaVersion as Instance['javaVersion']) ?? '17',
          playTime: inst.playTime,
          status: inst.status as Instance['status'],
          createdAt: inst.createdAt ?? new Date().toISOString(),
        };
      }
    );
    return loaded;
  });

  const addInstance = useCallback((inst: Instance) => {
    setInstances((prev) => {
      const normalized = inst.name.trim().toLowerCase();
      if (prev.some((p) => p.name.trim().toLowerCase() === normalized)) {
        throw new Error(`An instance with the name "${inst.name}" already exists`);
      }
      const next = [...prev, inst];
      saveInstances(next);
      return next;
    });
  }, []);

  const removeInstance = useCallback((id: string) => {
    // Critical order: disk first, state second.
    // If rm fails (permissions, file in use), we throw and do NOT touch the index.
    // Better to leave the orphaned instance visible and retryable,
    // than to delete it from JSON and lose the reference to a folder still taking up GB.
    removeInstanceFolder(id);

    setInstances((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveInstances(next);
      return next;
    });
  }, []);

  const updateInstance = useCallback((id: string, patch: Partial<Instance>) => {
    setInstances((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      saveInstances(next);
      return next;
    });
  }, []);

  return { instances, addInstance, removeInstance, updateInstance };
}
