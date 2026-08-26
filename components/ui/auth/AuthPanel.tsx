import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

export interface AuthPanelProps {
  username?: string | null;
  isLoggedIn?: boolean;
  focus?: boolean;
  onLogin?: (username: string) => void;
  onMicrosoftLogin?: () => void;
  onLogout?: () => void;
  theme?: InkUITheme;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  username,
  isLoggedIn = false,
  focus = false,
  onLogin,
  onMicrosoftLogin,
  onLogout,
  theme = darkTheme,
}) => {
  const [input, setInput] = useState(username ?? '');
  const [activeField, setActiveField] = useState<'input' | 'microsoft'>('input');

  useInput(
    (char, key) => {
      if (!focus) return;
      // Esc is handled by App (global)
      if (key.tab) {
        setActiveField((prev) => (prev === 'input' ? 'microsoft' : 'input'));
        return;
      }
      if (key.return) {
        if (isLoggedIn) {
          onLogout?.();
          return;
        }
        if (activeField === 'microsoft') {
          onMicrosoftLogin?.();
          return;
        }
        if (input.trim().length >= 3) {
          onLogin?.(input.trim());
        }
        return;
      }
      // When focus is on the Microsoft button, don't type
      if (activeField === 'microsoft') return;

      if (key.backspace || key.delete) {
        setInput((prev) => prev.slice(0, -1));
        return;
      }
      if (key.ctrl || key.meta) return;
      if (char && char.length === 1 && input.length < 16 && /^[a-zA-Z0-9_]$/.test(char)) {
        setInput((prev) => prev + char);
      }
    },
    { isActive: focus }
  );

  if (isLoggedIn) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
        <Box borderStyle="round" borderColor={theme.colors.success} paddingX={2} paddingY={1} flexDirection="column" alignItems="center" gap={1}>
          <Text bold color={theme.colors.success}>● Logged in</Text>
          <Box gap={1}>
            <Text color={theme.colors.text} bold>{username}</Text>
            <Text color={theme.colors.muted}>online</Text>
          </Box>
          <Box marginTop={1} borderStyle="round" borderColor={focus ? theme.colors.focus : theme.colors.border} paddingX={2}>
            <Text color={focus ? theme.colors.focus : theme.colors.muted} bold={focus}>
              {focus ? '↵ Log out  · Esc Back' : 'Esc to interact'}
            </Text>
          </Box>
        </Box>
        <Text dimColor>Esc to go back</Text>
      </Box>
    );
  }

  const isValid = input.trim().length >= 3;
  const inputFocused = focus && activeField === 'input';
  const msFocused = focus && activeField === 'microsoft';

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <Box borderStyle="round" borderColor={focus ? theme.colors.focus : theme.colors.border} paddingX={3} paddingY={1} flexDirection="column" gap={1} width={50}>
        <Text bold color={theme.colors.primary}>◐ Sign in</Text>
        <Text color={theme.colors.muted}>Choose how to log in — offline or Microsoft</Text>

        {/* Offline */}
        <Box marginTop={1} flexDirection="column" gap={1} borderStyle="single" borderColor={inputFocused ? theme.colors.focus : theme.colors.border} paddingX={1} paddingY={1}>
          <Text color={inputFocused ? theme.colors.focus : theme.colors.muted} bold={inputFocused}>■ Offline — name only</Text>
          <Text color={theme.colors.muted}>Username (3-16, a-z, 0-9, _):</Text>
          <Box borderStyle="single" borderColor={inputFocused ? theme.colors.focus : theme.colors.border} paddingX={1}>
            <Text>
              <Text color={input.length === 0 ? 'gray' : theme.colors.text} dimColor={input.length === 0}>
                {(input.length === 0 ? 'e.g. AledEv' : input).padEnd(16, ' ')}
              </Text>
              <Text color={inputFocused ? theme.colors.focus : 'gray'}>{inputFocused ? '█' : ' '}</Text>
            </Text>
          </Box>
          {!isValid && input.length > 0 && <Text color="yellow">Minimum 3 characters</Text>}
          <Box marginTop={1} width={20} justifyContent="center">
            <Text color={isValid && inputFocused ? 'green' : 'gray'} bold={isValid && inputFocused} backgroundColor={isValid && inputFocused ? 'green' : undefined}>
              {inputFocused ? ' ► Login offline ' : '   Login offline '}
            </Text>
          </Box>
        </Box>

        <Box justifyContent="center">
          <Text dimColor>── or ──</Text>
        </Box>

        {/* Microsoft */}
        <Box borderStyle="single" borderColor={msFocused ? theme.colors.focus : theme.colors.border} paddingX={1} paddingY={1} flexDirection="column" alignItems="center" gap={1}>
          <Text color={msFocused ? theme.colors.focus : theme.colors.muted} bold={msFocused}>⬡ Online — Microsoft</Text>
          <Text color={theme.colors.muted} dimColor>Use your Minecraft account</Text>
          <Box marginTop={1} width={24} justifyContent="center">
            <Text color={msFocused ? 'black' : 'cyan'} bold={msFocused} backgroundColor={msFocused ? 'cyan' : undefined}>
              {msFocused ? ' ► Login with Microsoft ' : '   Login with Microsoft '}
            </Text>
          </Box>
        </Box>
      </Box>
      <Text dimColor>{focus ? 'Esc to switch · Enter to confirm · Esc Back' : 'Esc to focus login'}</Text>
    </Box>
  );
};
