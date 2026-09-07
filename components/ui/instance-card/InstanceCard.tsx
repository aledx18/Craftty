import { Box, Text } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { icons, loaderIcon } from '@/components/ui/icons.js'
import { useTheme } from '@/components/ui/theme.js'

export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error'

export interface InstanceCardProps {
  name: string
  version: string
  loader?: string
  javaVersion?: string
  status?: InstanceStatus
  /** Compact progress under the status badge (e.g. "assets 40/400") */
  progressLabel?: string
  playTime?: string
  selected?: boolean
  focused?: boolean
  theme?: InkUITheme
}

function statusMeta(status: InstanceStatus, theme: InkUITheme) {
  switch (status) {
    case 'playing':
      return { icon: icons.play, label: 'playing', color: theme.colors.success }
    case 'updating':
      return { icon: icons.download, label: 'updating', color: theme.colors.warning }
    case 'error':
      return { icon: icons.error, label: 'error', color: theme.colors.error }
    default:
      return { icon: icons.check, label: 'ready', color: theme.colors.muted }
  }
}

/**
 * Full-width list row for an instance (not a card grid).
 * Layout: pointer · loader · name …… meta · status · time
 */
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
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const active = focused || selected
  const meta = statusMeta(status, theme)
  const nameColor = active ? theme.colors.focus : theme.colors.text
  const muted = theme.colors.muted

  return (
    <Box width="100%" gap={1} paddingX={1}>
      <Text color={active ? theme.colors.focus : muted}>{active ? icons.mdChevronRight : ' '}</Text>
      <Text color={active ? theme.colors.primary : muted}>{loaderIcon(loader)}</Text>
      <Box width={22}>
        <Text bold={active} color={nameColor} wrap="truncate-end">
          {name}
        </Text>
      </Box>
      <Text color={muted} wrap="truncate-end">
        {version}
        <Text dimColor> · </Text>
        {loader}
        {javaVersion ? (
          <>
            <Text dimColor> · </Text>
            {icons.java} {javaVersion}
          </>
        ) : null}
      </Text>
      <Box flexGrow={1} />
      {progressLabel ? (
        <Text color={theme.colors.warning} wrap="truncate-end">
          {icons.download} {progressLabel}
        </Text>
      ) : (
        <Text color={meta.color}>
          {meta.icon} {meta.label}
        </Text>
      )}
      {playTime ? (
        <Text dimColor>
          {' '}
          {icons.clock} {playTime}
        </Text>
      ) : null}
    </Box>
  )
}

export interface InstanceListProps {
  children: React.ReactNode
  gap?: number
}

/** Vertical list of instance rows. */
export const InstanceList: React.FC<InstanceListProps> = ({ children, gap = 1 }) => {
  return (
    <Box flexDirection="column" width="100%" gap={gap}>
      {children}
    </Box>
  )
}

/** @deprecated use InstanceList */
export const InstanceGrid = InstanceList
