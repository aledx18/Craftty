import { Box, Text, useInput } from 'ink'
import React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { useTheme } from '@/components/ui/theme.js'

export interface ConfirmProps {
  title: string
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  focus?: boolean
  onConfirm: () => void
  onCancel: () => void
  theme?: InkUITheme
}

export const Confirm: React.FC<ConfirmProps> = ({
  title,
  message,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  focus = false,
  onConfirm,
  onCancel,
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const [selected, setSelected] = React.useState<'cancel' | 'confirm'>('cancel')

  useInput(
    (input, key) => {
      if (!focus) return
      if (key.escape) {
        onCancel()
        return
      }
      if (key.tab || key.leftArrow || key.rightArrow) {
        setSelected((s) => (s === 'cancel' ? 'confirm' : 'cancel'))
        return
      }
      if (key.return) {
        if (selected === 'confirm') onConfirm()
        else onCancel()
        return
      }
      if (input === 'y' || input === 'Y') {
        onConfirm()
        return
      }
      if (input === 'n' || input === 'N') {
        onCancel()
        return
      }
    },
    { isActive: focus },
  )

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box
        borderStyle="round"
        borderColor={theme.colors.error}
        paddingX={3}
        paddingY={1}
        flexDirection="column"
        gap={1}
        width={60}
      >
        <Text bold color={theme.colors.error}>
          ⚠ {title}
        </Text>
        <Text color={theme.colors.text}>{message}</Text>
        {detail && (
          <Text color={theme.colors.warning} dimColor>
            {detail}
          </Text>
        )}
        <Box marginTop={1} gap={2} justifyContent="center">
          <Box
            borderStyle="round"
            borderColor={selected === 'cancel' ? theme.colors.focus : theme.colors.border}
            paddingX={2}
            backgroundColor={selected === 'cancel' && focus ? theme.colors.focus : undefined}
          >
            <Text
              color={selected === 'cancel' && focus ? theme.colors.textInverse : theme.colors.muted}
              bold={selected === 'cancel' && focus}
            >
              {selected === 'cancel' && focus ? `► ${cancelLabel} ` : `  ${cancelLabel} `}
            </Text>
          </Box>
          <Box
            borderStyle="round"
            borderColor={selected === 'confirm' ? theme.colors.error : theme.colors.border}
            paddingX={2}
            backgroundColor={selected === 'confirm' && focus ? theme.colors.error : undefined}
          >
            <Text
              color={selected === 'confirm' && focus ? theme.colors.text : theme.colors.error}
              bold={selected === 'confirm' && focus}
            >
              {selected === 'confirm' && focus ? `► ${confirmLabel} ` : `  ${confirmLabel} `}
            </Text>
          </Box>
        </Box>
      </Box>
      <Text dimColor>Tab to switch · Enter to confirm · Esc to cancel · y/n</Text>
    </Box>
  )
}
