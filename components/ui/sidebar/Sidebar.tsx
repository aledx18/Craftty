import React from 'react';
import { Box, Text } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';
import { Divider } from '../divider/Divider.js';
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

      {/* empuja todo lo de abajo al fondo sin repartir el medio */}
      <Box flexGrow={1} />

      <Box borderStyle="single" borderColor={'gray'} borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingBottom={1} paddingTop={1} gap={1}>
        <Text color="green">●</Text>
        <Text color={theme.colors.text}>AledEv</Text>
        <Text color={theme.colors.muted}>online</Text>
      </Box>
    </Box>
  );
};
