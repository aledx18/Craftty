import { Box, Text, useInput } from 'ink'
import type React from 'react'
import { useState } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { icons } from '@/components/ui/icons.js'
import { TextInput } from '@/components/ui/text-input/index.js'
import { useTheme } from '@/components/ui/theme.js'

export interface AuthPanelProps {
  username?: string | null
  isLoggedIn?: boolean
  focus?: boolean
  onLogin?: (username: string) => void
  onLogout?: () => void
  theme?: InkUITheme
}

function sanitizeUsername(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16)
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  username,
  isLoggedIn = false,
  focus = false,
  onLogin,
  onLogout,
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const [input, setInput] = useState(username ?? '')
  // Microsoft row is visible but not actionable yet (no fake login).
  const [activeField, setActiveField] = useState<'input' | 'microsoft'>('input')

  useInput(
    (_char, key) => {
      if (!focus) return
      if (key.tab) {
        setActiveField((prev) => (prev === 'input' ? 'microsoft' : 'input'))
        return
      }
      if (key.return) {
        if (isLoggedIn) {
          onLogout?.()
          return
        }
        if (activeField === 'microsoft') {
          // Honest no-op: Microsoft auth is not implemented.
          return
        }
        // Offline submit is handled by TextInput onSubmit when that field is focused.
      }
    },
    { isActive: focus },
  )

  if (isLoggedIn) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
        <Box
          borderStyle="round"
          borderColor={theme.colors.warning}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          alignItems="center"
          gap={1}
        >
          <Text bold color={theme.colors.warning}>
            {icons.check} Logged in
          </Text>
          <Box gap={1}>
            <Text color={theme.colors.text} bold>
              {username}
            </Text>
            <Text color={theme.colors.muted}>offline</Text>
          </Box>
          <Box
            marginTop={1}
            borderStyle="round"
            borderColor={focus ? theme.colors.focus : theme.colors.border}
            paddingX={2}
          >
            <Text color={focus ? theme.colors.focus : theme.colors.muted} bold={focus}>
              {focus ? '↵ Log out' : 'Enter to log out'}
            </Text>
          </Box>
        </Box>
      </Box>
    )
  }

  const isValid = input.trim().length >= 3
  const inputFocused = focus && activeField === 'input'
  const msFocused = focus && activeField === 'microsoft'

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <Box
        borderStyle="round"
        borderColor={focus ? theme.colors.focus : theme.colors.border}
        paddingX={3}
        paddingY={1}
        flexDirection="column"
        gap={1}
        width={50}
      >
        <Text bold color={theme.colors.primary}>
          {icons.signIn} Sign in
        </Text>
        <Text color={theme.colors.muted}>Offline play · Microsoft not available yet</Text>

        <Box
          marginTop={1}
          flexDirection="column"
          gap={1}
          borderStyle="single"
          borderColor={inputFocused ? theme.colors.focus : theme.colors.border}
          paddingX={1}
          paddingY={1}
        >
          <Text color={inputFocused ? theme.colors.focus : theme.colors.muted} bold={inputFocused}>
            {icons.user} Offline — name only
          </Text>
          <Text color={theme.colors.muted}>Username (3-16, a-z, 0-9, _)</Text>
          <Box
            borderStyle="single"
            borderColor={inputFocused ? theme.colors.focus : theme.colors.border}
            paddingX={1}
          >
            <TextInput
              value={input}
              onChange={(v) => setInput(sanitizeUsername(v))}
              onSubmit={(v) => {
                if (v.trim().length >= 3) onLogin?.(v.trim())
              }}
              placeholder="e.g. AledEv"
              focus={inputFocused}
              theme={theme}
            />
          </Box>
          {!isValid && input.length > 0 && <Text color="yellow">Minimum 3 characters</Text>}
          <Box marginTop={1} width={20} justifyContent="center">
            <Text
              color={isValid && inputFocused ? theme.colors.textInverse : theme.colors.muted}
              bold={isValid && inputFocused}
              backgroundColor={isValid && inputFocused ? theme.colors.success : undefined}
            >
              {inputFocused ? ' ► Login offline ' : '   Login offline '}
            </Text>
          </Box>
        </Box>

        <Box justifyContent="center">
          <Text dimColor>── or ──</Text>
        </Box>

        <Box
          borderStyle="single"
          borderColor={msFocused ? theme.colors.muted : theme.colors.border}
          paddingX={1}
          paddingY={1}
          flexDirection="column"
          alignItems="center"
          gap={1}
        >
          <Text color={theme.colors.muted} bold={msFocused} dimColor>
            {icons.server} Online — Microsoft
          </Text>
          <Text color={theme.colors.muted} dimColor>
            Not implemented — coming later
          </Text>
          <Box marginTop={1} width={28} justifyContent="center">
            <Text color={theme.colors.muted} dimColor>
              {msFocused ? ' ► unavailable ' : '   unavailable '}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
