import { useState, useCallback } from 'react';
import { loadInstances, saveInstances } from '../storage.js';
import type { Instance } from '../storage.js';

const SEED_INSTANCES: Instance[] = [
  { id: 'skyfactory4', name: 'SkyFactory 4', version: '1.12.2', loader: 'forge', folder: 'skyfactory4', playTime: '42h', status: 'ready', createdAt: new Date().toISOString() },
  { id: 'atm9', name: 'All The Mods 9', version: '1.20.1', loader: 'forge', folder: 'atm9', playTime: '128h', status: 'ready', createdAt: new Date().toISOString() },
  { id: 'vanilla121', name: 'Vanilla 1.21.1', version: '1.21.1', loader: 'vanilla', folder: 'vanilla121', playTime: '12h', status: 'ready', createdAt: new Date().toISOString() },
];

export function useInstances() {
  const [instances, setInstances] = useState<Instance[]>(() => {
    const loaded = loadInstances();
    if (loaded.length === 0) {
      saveInstances(SEED_INSTANCES);
      return SEED_INSTANCES;
    }
    return loaded;
  });

  const addInstance = useCallback((inst: Instance) => {
    setInstances((prev) => {
      const next = [...prev, inst];
      saveInstances(next);
      return next;
    });
  }, []);

  const removeInstance = useCallback((id: string) => {
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

  return { instances, setInstances, addInstance, removeInstance, updateInstance };
}
