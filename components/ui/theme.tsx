import type React from 'react'
import { createContext, useContext } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { crafttyTheme } from '@/components/ui/_core.js'

const ThemeContext = createContext<InkUITheme>(crafttyTheme)

export function ThemeProvider({
  theme = crafttyTheme,
  children,
}: {
  theme?: InkUITheme
  children: React.ReactNode
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

/** Active app theme. Prefer this over importing darkTheme in leaf components. */
export function useTheme(): InkUITheme {
  return useContext(ThemeContext)
}
