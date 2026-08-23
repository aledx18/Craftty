import { useState, useCallback } from 'react';
import { loadAccount, saveAccount, clearAccount } from '../storage.js';
import type { Account } from '../storage.js';

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(() => loadAccount());

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
