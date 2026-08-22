import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '../badge/index.js';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

export type InstanceStatus = 'ready' | 'playing' | 'updating' | 'error';

export interface InstanceCardProps {
  name: string;
  version: string;
  loader?: string; // vanilla, fabric, forge, quilt
  status?: InstanceStatus;
  playTime?: string;
  selected?: boolean;
  focused?: boolean;
  width?: number;
  theme?: InkUITheme;
}

function statusBadge(status: InstanceStatus) {
  switch (status) {
    case 'playing': return { label: 'jugando', variant: 'success' as const };
    case 'updating': return { label: 'actualizando', variant: 'warning' as const };
    case 'error': return { label: 'error', variant: 'error' as const };
    default: return null;
  }
}

function loaderIcon(loader?: string) {
  switch (loader) {
    case 'fabric': return '◈';
    case 'forge': return '⬡';
    case 'quilt': return '⬢';
    case 'neoforge': return '⬣';
    default: return '⬜'; // vanilla
  }
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  name,
  version,
  loader = 'vanilla',
  status = 'ready',
  playTime,
  selected = false,
  focused = false,
  width = 32,
  theme = darkTheme,
}) => {
  const badge = statusBadge(status);
  const borderColor = focused ? theme.colors.focus : selected ? theme.colors.primary : theme.colors.border;
  const borderStyle = focused || selected ? 'round' as const : 'single' as const;

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
    >
      {/* Header de la card: icono + nombre */}
      <Box gap={1}>
        <Text color={selected ? theme.colors.primary : theme.colors.muted}>{loaderIcon(loader)}</Text>
        <Text bold color={selected ? theme.colors.primary : theme.colors.text} wrap="truncate-end">
          {name}
        </Text>
      </Box>

      {/* Versión + loader */}
      <Box gap={1} marginTop={0}>
        <Text color={theme.colors.muted}>{version}</Text>
        <Text dimColor>·</Text>
        <Text color={theme.colors.muted}>{loader}</Text>
      </Box>

      {/* Footer: badge estado + tiempo */}
      <Box marginTop={1} justifyContent="space-between">
        <Box>
          {badge ? (
            <Box borderStyle="round" borderColor={badge.variant === 'success' ? 'green' : badge.variant === 'warning' ? 'yellow' : 'red'} paddingX={0}>
              <Text color={badge.variant === 'success' ? 'green' : badge.variant === 'warning' ? 'yellow' : 'red'}> {badge.label} </Text>
            </Box>
          ) : (
            <Text color="gray"> listo</Text>
          )}
        </Box>
        {playTime && <Text dimColor>{playTime}</Text>}
      </Box>

      {focused && (
        <Box marginTop={0}>
          <Text color={theme.colors.focus} dimColor>↵ jugar · e editar</Text>
        </Box>
      )}
    </Box>
  );
};

// Grid contenedor — layout flex wrap simulado con filas
export interface InstanceGridProps {
  children: React.ReactNode;
  gap?: number;
}

export const InstanceGrid: React.FC<InstanceGridProps> = ({ children, gap = 1 }) => {
  return (
    <Box flexDirection="row" flexWrap="wrap" gap={gap}>
      {children}
    </Box>
  );
};
