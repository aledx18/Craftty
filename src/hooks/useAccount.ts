import { useCallback, useState } from 'react'
import { offlinePlayerUuid } from '@/src/minecraft/offlineUuid.js'
import type { Account } from '@/src/storage.js'
import { clearAccount, loadAccount, saveAccount } from '@/src/storage.js'

function loadStableAccount(): Account | null {
  const loaded = loadAccount()
  if (!loaded) return null
  const uuid = offlinePlayerUuid(loaded.username)
  if (loaded.uuid === uuid) return loaded
  const fixed = { username: loaded.username, uuid }
  try {
    saveAccount(fixed)
  } catch {
    // Still use the deterministic id in memory even if disk write fails.
  }
  return fixed
}

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(() => loadStableAccount())

  const login = useCallback((acc: Account) => {
    saveAccount(acc)
    setAccount(acc)
  }, [])

  const logout = useCallback(() => {
    clearAccount()
    setAccount(null)
  }, [])

  return { account, login, logout, isLoggedIn: !!account }
}
