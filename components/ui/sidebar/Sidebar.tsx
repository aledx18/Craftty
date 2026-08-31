import { Box, Text } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { Select } from '@/components/ui/select/Select.js'
import { useTheme } from '@/components/ui/theme.js'

export interface SidebarItem {
  id: string
  label: string
  icon?: string
  badge?: string
}

export interface SidebarProps {
  items: SidebarItem[]
  selectedId: string
  onSelect?: (id: string) => void
  theme?: InkUITheme
  width?: number
  height?: number
  focus?: boolean
  account?: { username: string } | null
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  selectedId,
  onSelect,
  theme: themeProp,
  width = 20,
  height,
  focus = false,
  account = null,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={height ? undefined : 1}
      flexShrink={0}
      borderStyle="bold"
      borderRight
      borderTop={false}
      borderBottom={false}
      borderLeft={false}
      borderColor={theme.colors.border}
      paddingRight={1}
      marginRight={1}
    >
      <Box marginTop={1}>
        <Select
          items={items.map((item) => ({
            label: `${item.icon ? `${item.icon} ` : ''}${item.label}${item.badge ? ` (${item.badge})` : ''}`,
            value: item.id,
          }))}
          value={selectedId}
          onSelect={(item) => onSelect?.(String(item.value))}
          focus={focus}
          theme={theme}
        />
      </Box>

      <Box flexGrow={1} />

      <Box
        borderStyle="single"
        borderColor={selectedId === 'accounts' ? theme.colors.focus : theme.colors.border}
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingTop={1}
        flexDirection="row"
        gap={1}
        alignItems="center"
      >
        <Box
          width={5}
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          borderStyle="round"
          borderColor={
            selectedId === 'accounts'
              ? theme.colors.focus
              : account
                ? theme.colors.warning
                : theme.colors.muted
          }
        >
          <Text
            color={
              selectedId === 'accounts'
                ? theme.colors.focus
                : account
                  ? theme.colors.warning
                  : theme.colors.muted
            }
          >
            {account ? '◐' : '?'}
          </Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {account ? (
            <>
              <Text
                color={selectedId === 'accounts' ? theme.colors.focus : theme.colors.text}
                bold
                wrap="truncate-end"
              >
                {account.username}
              </Text>
              <Box gap={1}>
                <Text color={theme.colors.warning}>●</Text>
                <Text color={theme.colors.muted}>offline</Text>
              </Box>
            </>
          ) : (
            <>
              <Text
                color={selectedId === 'accounts' ? theme.colors.focus : theme.colors.muted}
                bold={selectedId === 'accounts'}
                wrap="truncate"
              >
                Not connected
              </Text>
              <Text dimColor>offline</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
