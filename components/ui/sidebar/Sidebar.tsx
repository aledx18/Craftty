import React from 'react';
import { Box, Text } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';
import { Select } from '../select/Select.js';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  selectedId: string;
  onSelect?: (id: string) => void;
  title?: string;
  theme?: InkUITheme;
  width?: number;
  height?: number;
  focus?: boolean;
  account?: { username: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  selectedId,
  onSelect,
  title = 'NAVEGACIÓN',
  theme = darkTheme,
  width = 20,
  height,
  focus = false,
  account = null,
}) => {
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
      <Text bold color={theme.colors.muted}>{title}</Text>
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
        borderColor={selectedId === 'accounts' ? theme.colors.focus : 'gray'}
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
          height={3}
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          borderStyle="round"
          borderColor={selectedId === 'accounts' ? theme.colors.focus : account ? 'green' : 'gray'}
        >
          <Text color={selectedId === 'accounts' ? theme.colors.focus : account ? 'green' : 'gray'}>{account ? '◐' : '?'}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {account ? (
            <>
              <Text color={selectedId === 'accounts' ? theme.colors.focus : theme.colors.text} bold wrap="truncate-end">{account.username}</Text>
              <Box gap={1}>
                <Text color="green">●</Text>
                <Text color={theme.colors.muted}>online</Text>
              </Box>
            </>
          ) : (
            <>
              <Text color={selectedId === 'accounts' ? theme.colors.focus : theme.colors.muted} bold={selectedId === 'accounts'} wrap="truncate">No conectado</Text>
              <Text dimColor>offline</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
