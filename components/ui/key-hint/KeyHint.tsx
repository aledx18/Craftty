import { Box, Text } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { darkTheme } from '@/components/ui/_core.js'

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

export const KeyHint: React.FC<KeyHintProps> = ({ keys, theme = darkTheme }) => (
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
