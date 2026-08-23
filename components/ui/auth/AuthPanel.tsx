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
  onCancel?: () => void;
  theme?: InkUITheme;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  username,
  isLoggedIn = false,
  focus = false,
  onLogin,
  onMicrosoftLogin,
  onLogout,
  onCancel,
  theme = darkTheme,
}) => {
  const [input, setInput] = useState(username ?? '');
  const [activeField, setActiveField] = useState<'input' | 'microsoft'>('input');

  useInput(
    (char, key) => {
      if (!focus) return;

      if (key.escape) {
        onCancel?.();
        return;
      }
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
      // Cuando el foco está en el botón de Microsoft, no escribir
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
          <Text bold color={theme.colors.success}>● Sesión iniciada</Text>
          <Box gap={1}>
            <Text color={theme.colors.text} bold>{username}</Text>
            <Text color={theme.colors.muted}>online</Text>
          </Box>
          <Box marginTop={1} borderStyle="round" borderColor={focus ? theme.colors.focus : theme.colors.border} paddingX={2}>
            <Text color={focus ? theme.colors.focus : theme.colors.muted} bold={focus}>
              {focus ? '↵ Cerrar sesión  · Esc Volver' : 'Tab para interactuar'}
            </Text>
          </Box>
        </Box>
        <Text dimColor>Tab para volver</Text>
      </Box>
    );
  }

  const isValid = input.trim().length >= 3;
  const inputFocused = focus && activeField === 'input';
  const msFocused = focus && activeField === 'microsoft';

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <Box borderStyle="round" borderColor={focus ? theme.colors.focus : theme.colors.border} paddingX={3} paddingY={1} flexDirection="column" gap={1} width={50}>
        <Text bold color={theme.colors.primary}>◐ Iniciar sesión</Text>
        <Text color={theme.colors.muted}>Elegí cómo entrar — offline o Microsoft</Text>

        {/* Offline */}
        <Box marginTop={1} flexDirection="column" gap={1} borderStyle="single" borderColor={inputFocused ? theme.colors.focus : theme.colors.border} paddingX={1} paddingY={1}>
          <Text color={inputFocused ? theme.colors.focus : theme.colors.muted} bold={inputFocused}>■ Offline — solo nombre</Text>
          <Text color={theme.colors.muted}>Usuario (3-16, a-z, 0-9, _):</Text>
          <Box borderStyle="single" borderColor={inputFocused ? theme.colors.focus : theme.colors.border} paddingX={1}>
            <Text>
              <Text color={input.length === 0 ? 'gray' : theme.colors.text} dimColor={input.length === 0}>
                {(input.length === 0 ? 'ej: AledEv' : input).padEnd(16, ' ')}
              </Text>
              <Text color={inputFocused ? theme.colors.focus : 'gray'}>{inputFocused ? '█' : ' '}</Text>
            </Text>
          </Box>
          {!isValid && input.length > 0 && <Text color="yellow">Mínimo 3 caracteres</Text>}
          <Box marginTop={1} width={20} justifyContent="center">
            <Text color={isValid && inputFocused ? 'green' : 'gray'} bold={isValid && inputFocused} backgroundColor={isValid && inputFocused ? 'green' : undefined}>
              {inputFocused ? ' ► Entrar offline ' : '   Entrar offline '}
            </Text>
          </Box>
        </Box>

        <Box justifyContent="center">
          <Text dimColor>── o ──</Text>
        </Box>

        {/* Microsoft */}
        <Box borderStyle="single" borderColor={msFocused ? theme.colors.focus : theme.colors.border} paddingX={1} paddingY={1} flexDirection="column" alignItems="center" gap={1}>
          <Text color={msFocused ? theme.colors.focus : theme.colors.muted} bold={msFocused}>⬡ Online — Microsoft</Text>
          <Text color={theme.colors.muted} dimColor>Usa tu cuenta de Minecraft</Text>
          <Box marginTop={1} width={24} justifyContent="center">
            <Text color={msFocused ? 'black' : 'cyan'} bold={msFocused} backgroundColor={msFocused ? 'cyan' : undefined}>
              {msFocused ? ' ► Login con Microsoft ' : '   Login con Microsoft '}
            </Text>
          </Box>
        </Box>
      </Box>
      <Text dimColor>{focus ? 'Tab para cambiar · Enter para confirmar · Esc Volver' : 'Tab para enfocar el login'}</Text>
    </Box>
  );
};
