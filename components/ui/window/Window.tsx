import React from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

export interface WindowProps {
  title: string;
  version?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  theme?: InkUITheme;
}

export const Window: React.FC<WindowProps> = ({
  title,
  version,
  subtitle,
  children,
  footer,
  theme = darkTheme,
}) => {
  const { columns, rows } = useWindowSize();
  const width = columns || 80;
  const height = Math.max(10, rows || 24);
  const fullTitle = version ? `${title} v${version}` : title;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.border}
      width={width}
      height={height}
    >
      {/* Título incrustado en el borde superior — truco marginTop -1 */}
      <Box marginTop={-1} marginLeft={2} paddingX={1} alignSelf="flex-start">
        <Text bold color={theme.colors.primary}>
          {' '}
          {fullTitle}{' '}
        </Text>
        {subtitle && (
          <Text color={theme.colors.muted}> · {subtitle}</Text>
        )}
      </Box>

      {/* Contenido principal — ocupa todo el espacio disponible */}
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingBottom={1} overflow="hidden">
        {children}
      </Box>

      {/* Footer / barra de estado inferior */}
      {footer && (
        <Box
          borderStyle="single"
          borderTop
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
          borderColor={theme.colors.border}
          paddingX={1}
          flexShrink={0}
        >
          {footer}
        </Box>
      )}
    </Box>
  );
};
