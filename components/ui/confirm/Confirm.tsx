import React from 'react';
import { Box, Text, useInput } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

export interface ConfirmProps {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  focus?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  theme?: InkUITheme;
}

export const Confirm: React.FC<ConfirmProps> = ({
  title,
  message,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  focus = false,
  onConfirm,
  onCancel,
  theme = darkTheme,
}) => {
  const [selected, setSelected] = React.useState<'cancel' | 'confirm'>('cancel');

  useInput(
    (input, key) => {
      if (!focus) return;
      if (key.escape) { onCancel(); return; }
      if (key.tab || key.leftArrow || key.rightArrow) {
        setSelected((s) => (s === 'cancel' ? 'confirm' : 'cancel'));
        return;
      }
      if (key.return) {
        if (selected === 'confirm') onConfirm();
        else onCancel();
        return;
      }
      if (input === 'y' || input === 'Y') { onConfirm(); return; }
      if (input === 'n' || input === 'N') { onCancel(); return; }
    },
    { isActive: focus }
  );

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box borderStyle="round" borderColor="red" paddingX={3} paddingY={1} flexDirection="column" gap={1} width={60}>
        <Text bold color="red">⚠ {title}</Text>
        <Text color={theme.colors.text}>{message}</Text>
        {detail && <Text color="yellow" dimColor>{detail}</Text>}
        <Box marginTop={1} gap={2} justifyContent="center">
          <Box borderStyle="round" borderColor={selected === 'cancel' ? theme.colors.focus : 'gray'} paddingX={2} backgroundColor={selected === 'cancel' && focus ? theme.colors.focus : undefined}>
            <Text color={selected === 'cancel' && focus ? 'black' : 'gray'} bold={selected === 'cancel' && focus}>
              {selected === 'cancel' && focus ? `► ${cancelLabel} ` : `  ${cancelLabel} `}
            </Text>
          </Box>
          <Box borderStyle="round" borderColor={selected === 'confirm' ? 'red' : 'gray'} paddingX={2} backgroundColor={selected === 'confirm' && focus ? 'red' : undefined}>
            <Text color={selected === 'confirm' && focus ? 'white' : 'red'} bold={selected === 'confirm' && focus}>
              {selected === 'confirm' && focus ? `► ${confirmLabel} ` : `  ${confirmLabel} `}
            </Text>
          </Box>
        </Box>
      </Box>
      <Text dimColor>Tab to switch · Enter to confirm · Esc to cancel · y/n</Text>
    </Box>
  );
};
