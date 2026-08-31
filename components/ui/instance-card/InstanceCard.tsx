import { Box, Text } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { useTheme } from '@/components/ui/theme.js'

export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error'

export interface InstanceCardProps {
  name: string
  version: string
  loader?: string // vanilla, fabric, forge, quilt
  javaVersion?: string
  status?: InstanceStatus
  /** Compact progress under the status badge (e.g. "assets 40/400") */
  progressLabel?: string
  playTime?: string
  selected?: boolean
  focused?: boolean
  width?: number
  theme?: InkUITheme
}

function statusBadge(status: InstanceStatus, theme: InkUITheme) {
  switch (status) {
    case 'playing':
      return { label: 'playing', color: theme.colors.success }
    case 'updating':
      return { label: 'updating', color: theme.colors.warning }
    case 'error':
      return { label: 'error', color: theme.colors.error }
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
  progressLabel,
  playTime,
  selected = false,
  focused = false,
  width = 32,
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const badge = statusBadge(status, theme)
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
            <Box borderStyle="round" borderColor={badge.color} paddingX={0}>
              <Text color={badge.color}> {badge.label} </Text>
            </Box>
          ) : (
            <Text color={theme.colors.muted}> ready</Text>
          )}
        </Box>
        {progressLabel ? (
          <Text color={theme.colors.warning} dimColor wrap="truncate-end">
            {progressLabel}
          </Text>
        ) : playTime ? (
          <Text dimColor>{playTime}</Text>
        ) : null}
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
