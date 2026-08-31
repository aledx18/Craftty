import { Box, Text, useInput } from 'ink'
import type React from 'react'
import { useState } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { TextInput } from '@/components/ui/text-input/index.js'
import { useTheme } from '@/components/ui/theme.js'

export interface AuthPanelProps {
  username?: string | null
  isLoggedIn?: boolean
  focus?: boolean
  onLogin?: (username: string) => void
  onMicrosoftLogin?: () => void
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
  onMicrosoftLogin,
  onLogout,
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const [input, setInput] = useState(username ?? '')
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
          onMicrosoftLogin?.()
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
            ● Logged in
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
              {focus ? '↵ Log out' : 'Tab or Enter from sidebar'}
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
          ◐ Sign in
        </Text>
        <Text color={theme.colors.muted}>Offline play for now · Microsoft later</Text>

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
            ■ Offline — name only
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
          borderColor={msFocused ? theme.colors.focus : theme.colors.border}
          paddingX={1}
          paddingY={1}
          flexDirection="column"
          alignItems="center"
          gap={1}
        >
          <Text color={msFocused ? theme.colors.focus : theme.colors.muted} bold={msFocused}>
            ⬡ Online — Microsoft
          </Text>
          <Text color={theme.colors.muted} dimColor>
            Coming later — stub for now
          </Text>
          <Box marginTop={1} width={24} justifyContent="center">
            <Text
              color={msFocused ? theme.colors.textInverse : theme.colors.primary}
              bold={msFocused}
              backgroundColor={msFocused ? theme.colors.primary : undefined}
            >
              {msFocused ? ' ► Login with Microsoft ' : '   Login with Microsoft '}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
