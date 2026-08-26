import { useState, useCallback } from 'react';
import { loadAccount, saveAccount, clearAccount } from '../storage.js';
import type { Account } from '../storage.js';
import { offlinePlayerUuid } from '../minecraft/offlineUuid.js';

function loadStableAccount(): Account | null {
  const loaded = loadAccount();
  if (!loaded) return null;
  const uuid = offlinePlayerUuid(loaded.username);
  if (loaded.uuid === uuid) return loaded;
  const fixed = { username: loaded.username, uuid };
  try {
    saveAccount(fixed);
  } catch {
    // Still use the deterministic id in memory even if disk write fails.
  }
  return fixed;
}

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(() => loadStableAccount());

  const login = useCallback((acc: Account) => {
    saveAccount(acc);
    setAccount(acc);
  }, []);

  const logout = useCallback(() => {
    clearAccount();
    setAccount(null);
  }, []);

  return { account, login, logout, isLoggedIn: !!account };
}
