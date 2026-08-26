import { Box, Text } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { darkTheme } from '@/components/ui/_core.js'
import { Badge } from '@/components/ui/badge/index.js'

export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error'

export interface InstanceCardProps {
  name: string
  version: string
  loader?: string // vanilla, fabric, forge, quilt
  javaVersion?: string
  status?: InstanceStatus
  playTime?: string
  selected?: boolean
  focused?: boolean
  width?: number
  theme?: InkUITheme
}

function statusBadge(status: InstanceStatus) {
  switch (status) {
    case 'playing':
      return { label: 'playing', variant: 'success' as const }
    case 'updating':
      return { label: 'updating', variant: 'warning' as const }
    case 'error':
      return { label: 'error', variant: 'error' as const }
    default:
      return null
  }
}

function loaderIcon(loader?: string) {
  switch (loader) {
    case 'fabric':
      return '◈'
    case 'forge':
      return '⬡'
    case 'quilt':
      return '⬢'
    case 'neoforge':
      return '⬣'
    default:
      return '⬜' // vanilla
  }
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  name,
  version,
  loader = 'vanilla',
  javaVersion,
  status = 'ready',
  playTime,
  selected = false,
  focused = false,
  width = 32,
  theme = darkTheme,
}) => {
  const badge = statusBadge(status)
  const borderColor = focused
    ? theme.colors.focus
    : selected
      ? theme.colors.primary
      : theme.colors.border
  const borderStyle = focused || selected ? ('round' as const) : ('single' as const)

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
    >
      {/* Card header: icon + name */}
      <Box gap={1}>
        <Text color={selected ? theme.colors.primary : theme.colors.muted}>
          {loaderIcon(loader)}
        </Text>
        <Text bold color={selected ? theme.colors.primary : theme.colors.text} wrap="truncate-end">
          {name}
        </Text>
      </Box>

      {/* Version + loader + Java */}
      <Box gap={1} marginTop={0}>
        <Text color={theme.colors.muted}>{version}</Text>
        <Text dimColor>·</Text>
        <Text color={theme.colors.muted}>{loader}</Text>
        {javaVersion && (
          <>
            <Text dimColor>·</Text>
            <Text color={theme.colors.muted}>Java {javaVersion}</Text>
          </>
        )}
      </Box>

      {/* Footer: status badge + play time */}
      <Box marginTop={1} justifyContent="space-between">
        <Box>
          {badge ? (
            <Box
              borderStyle="round"
              borderColor={
                badge.variant === 'success'
                  ? 'green'
                  : badge.variant === 'warning'
                    ? 'yellow'
                    : 'red'
              }
              paddingX={0}
            >
              <Text
                color={
                  badge.variant === 'success'
                    ? 'green'
                    : badge.variant === 'warning'
                      ? 'yellow'
                      : 'red'
                }
              >
                {' '}
                {badge.label}{' '}
              </Text>
            </Box>
          ) : (
            <Text color="gray"> ready</Text>
          )}
        </Box>
        {playTime && <Text dimColor>{playTime}</Text>}
      </Box>
    </Box>
  )
}

// Grid container — simulated flex wrap layout with rows
export interface InstanceGridProps {
  children: React.ReactNode
  gap?: number
}

export const InstanceGrid: React.FC<InstanceGridProps> = ({ children, gap = 1 }) => {
  return (
    <Box flexDirection="row" flexWrap="wrap" gap={gap}>
      {children}
    </Box>
  )
}
