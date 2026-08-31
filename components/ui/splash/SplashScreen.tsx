import cfonts from 'cfonts'
import { Box, Text, useInput, useWindowSize } from 'ink'
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '@/components/ui/theme.js'

function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip cfonts ANSI color codes
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

function renderLogo(text: string, maxWidth: number): string[] {
  const font = maxWidth >= 70 ? 'block' : maxWidth >= 40 ? 'chrome' : 'tiny'
  const result = cfonts.render(text, {
    font,
    colors: ['system'],
    background: 'transparent',
    letterSpacing: 0,
    lineHeight: 1,
    space: false,
    maxLength: '0',
    env: 'node',
  }) as { array?: string[]; string: string }

  return (result.array ?? result.string.split('\n'))
    .map((line) => stripAnsi(line).replace(/\s+$/g, ''))
    .filter((line) => line.length > 0)
}

function firstEnabledIndex(menu: SplashMenuItem[]): number {
  const i = menu.findIndex((m) => !m.disabled)
  return i >= 0 ? i : 0
}

function moveSelection(menu: SplashMenuItem[], from: number, dir: 1 | -1): number {
  if (menu.length === 0) return 0
  let next = from
  for (let step = 0; step < menu.length; step++) {
    next = (next + dir + menu.length) % menu.length
    if (!menu[next]?.disabled) return next
  }
  return from
}

export interface SplashMenuItem {
  key: string
  label: string
  icon?: string
  hint?: string
  disabled?: boolean
}

export interface SplashScreenProps {
  accountName?: string | null
  instanceCount?: number
  menu: SplashMenuItem[]
  onAction: (key: string) => void
  focus?: boolean
}

export function SplashScreen({
  accountName,
  instanceCount = 0,
  menu,
  onAction,
  focus = true,
}: SplashScreenProps) {
  const theme = useTheme()
  const { columns, rows } = useWindowSize()
  const width = columns || 80
  const height = rows || 24

  const logo = useMemo(() => renderLogo('craftty', width - 4), [width])
  const logoWidth = Math.max(0, ...logo.map((l) => l.length))

  const [selectedIdx, setSelectedIdx] = useState(() => firstEnabledIndex(menu))

  // Keep selection valid when menu changes (login/logout).
  useEffect(() => {
    setSelectedIdx((i) => {
      if (menu[i] && !menu[i]!.disabled) return i
      return firstEnabledIndex(menu)
    })
  }, [menu])

  useInput(
    (input, key) => {
      if (!focus) return

      if (key.upArrow) {
        setSelectedIdx((i) => moveSelection(menu, i, -1))
        return
      }
      if (key.downArrow) {
        setSelectedIdx((i) => moveSelection(menu, i, 1))
        return
      }
      if (key.return) {
        const item = menu[selectedIdx]
        if (item && !item.disabled) onAction(item.key)
        return
      }

      // Hotkeys still work (LazyVim-style letter on the right).
      const hit = menu.find((m) => !m.disabled && m.key.toLowerCase() === input.toLowerCase())
      if (hit) {
        const idx = menu.findIndex((m) => m.key === hit.key)
        if (idx >= 0) setSelectedIdx(idx)
        onAction(hit.key)
      }
    },
    { isActive: focus },
  )

  const statusLine = accountName
    ? `logged in as ${accountName} · ${instanceCount} instance${instanceCount === 1 ? '' : 's'}`
    : 'not logged in · offline play'

  return (
    <Box
      width={width}
      height={height}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        {logo.map((line) => (
          <Text key={line} color={theme.colors.secondary}>
            {line.padEnd(logoWidth, ' ')}
          </Text>
        ))}
        <Text color={theme.colors.muted}>TUI Minecraft launcher</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} width={Math.min(44, width - 4)} gap={1}>
        {menu.map((item, idx) => {
          const active = idx === selectedIdx
          const muted = !!item.disabled
          const color = muted ? theme.colors.muted : active ? theme.colors.focus : theme.colors.text
          return (
            <Box key={item.key} justifyContent="space-between">
              <Box gap={1}>
                <Text color={active && !muted ? theme.colors.focus : theme.colors.muted}>
                  {active && !muted ? '❯' : ' '}
                </Text>
                <Text color={color}>{item.icon ?? '·'}</Text>
                <Text color={color} bold={active && !muted} dimColor={muted}>
                  {item.label}
                </Text>
              </Box>
              <Text color={muted ? theme.colors.muted : theme.colors.warning} bold={!muted}>
                {item.key}
              </Text>
            </Box>
          )
        })}
      </Box>

      <Box marginTop={2} flexDirection="column" alignItems="center" gap={0}>
        <Text color={theme.colors.info} dimColor>
          ⚡ {statusLine}
        </Text>
        <Text dimColor>↑↓ select · ↵ confirm · letter shortcut</Text>
      </Box>
    </Box>
  )
}
