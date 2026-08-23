import { useState, useCallback } from 'react';
import { loadInstances, saveInstances } from '../storage.js';
import { removeInstanceFolder } from '../instanceFiles.js';
import type { Instance } from '../storage.js';

const SEED_INSTANCES: Instance[] = [
  { id: 'skyfactory4', name: 'SkyFactory 4', version: '1.12.2', loader: 'forge', javaVersion: '8', folder: 'skyfactory4', playTime: '42h', status: 'ready', createdAt: new Date().toISOString() },
  { id: 'atm9', name: 'All The Mods 9', version: '1.20.1', loader: 'forge', javaVersion: '17', folder: 'atm9', playTime: '128h', status: 'ready', createdAt: new Date().toISOString() },
  { id: 'vanilla121', name: 'Vanilla 1.21.1', version: '1.21.1', loader: 'vanilla', javaVersion: '21', folder: 'vanilla121', playTime: '12h', status: 'ready', createdAt: new Date().toISOString() },
];

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
      (inst): Instance => ({
        id: inst.id,
        name: inst.name,
        version: inst.version,
        loader: (inst.loader as Instance['loader']) ?? 'vanilla',
        folder: inst.folder,
        javaVersion: (inst.javaVersion as Instance['javaVersion']) ?? '17',
        playTime: inst.playTime,
        status: inst.status as Instance['status'],
        createdAt: inst.createdAt ?? new Date().toISOString(),
      })
    );
    if (loaded.length === 0) {
      saveInstances(SEED_INSTANCES);
      return SEED_INSTANCES;
    }
    return loaded;
  });

  const addInstance = useCallback((inst: Instance) => {
    setInstances((prev) => {
      const normalized = inst.name.trim().toLowerCase();
      if (prev.some((p) => p.name.trim().toLowerCase() === normalized)) {
        throw new Error(`Ya existe una instancia con el nombre "${inst.name}"`);
      }
      const next = [...prev, inst];
      saveInstances(next);
      return next;
    });
  }, []);

  const removeInstance = useCallback((id: string) => {
    // Orden crítico: disco primero, estado después.
    // Si el rm falla (permisos, archivo en uso), lanzamos y NO tocamos el índice.
    // Mejor dejar la instancia huérfana pero visible y reintentable,
    // que borrarla del JSON y perder la referencia a una carpeta que sigue ocupando GB.
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
