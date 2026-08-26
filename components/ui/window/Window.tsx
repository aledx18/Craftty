import { Box, Text, useWindowSize } from 'ink'
import type React from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { darkTheme } from '@/components/ui/_core.js'

export interface WindowProps {
  title: string
  version?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  theme?: InkUITheme
}

export const Window: React.FC<WindowProps> = ({
  title,
  version,
  subtitle,
  children,
  footer,
  theme = darkTheme,
}) => {
  const { columns, rows } = useWindowSize()
  const width = columns || 80
  const height = Math.max(10, rows || 24)
  const fullTitle = version ? `${title} v${version}` : title

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.border}
      width={width}
      height={height}
    >
      {/* Title embedded in top border — marginTop -1 trick */}
      <Box marginTop={-1} marginLeft={2} paddingX={1} alignSelf="flex-start">
        <Text bold color={theme.colors.primary}>
          {' '}
          {fullTitle}{' '}
        </Text>
        {subtitle && <Text color={theme.colors.muted}> · {subtitle}</Text>}
      </Box>

      {/* Main content — fills all available space */}
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingBottom={1} overflow="hidden">
        {children}
      </Box>

      {/* Footer / bottom status bar */}
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
  )
}
