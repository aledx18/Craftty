import { useCallback, useState } from 'react'
import type { Account } from '@/src/storage.js'
import { clearAccount, loadAccount, saveAccount } from '@/src/storage.js'

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(() => loadAccount())

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
