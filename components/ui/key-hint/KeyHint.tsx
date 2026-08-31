import { Box, Text } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { useTheme } from '@/components/ui/theme.js'

export interface KeyHintItem {
  /** Displayed in brackets, e.g. "Enter", "↑↓", "Space" */
  key: string
  /** Description label, e.g. "Select", "Navigate", "Toggle" */
  label: string
}

export interface KeyHintProps {
  keys: KeyHintItem[]
  theme?: InkUITheme
}

export const KeyHint: React.FC<KeyHintProps> = ({ keys, theme: themeProp }) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  return (
    <Box gap={2}>
      {keys.map(({ key, label }) => (
        <Box key={key} gap={1}>
          <Text bold dimColor>
            [{key}]
          </Text>
          <Text color={theme.colors.muted}>{label}</Text>
        </Box>
      ))}
    </Box>
  )
}
