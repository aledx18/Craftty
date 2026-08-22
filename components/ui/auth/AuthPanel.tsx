import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

export interface AuthPanelProps {
  username?: string | null;
  isLoggedIn?: boolean;
  focus?: boolean;
  onLogin?: (username: string) => void;
  onLogout?: () => void;
  onCancel?: () => void;
  theme?: InkUITheme;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  username,
  isLoggedIn = false,
  focus = false,
  onLogin,
  onLogout,
  onCancel,
  theme = darkTheme,
}) => {
  const [input, setInput] = useState(username ?? '');
  const [submitted, setSubmitted] = useState(false);

  useInput(
    (char, key) => {
      if (!focus) return;

      if (key.escape) {
        onCancel?.();
        return;
      }
      if (key.return) {
        if (isLoggedIn) {
          onLogout?.();
        } else if (input.trim().length >= 3) {
          setSubmitted(true);
          onLogin?.(input.trim());
        }
        return;
      }
      if (key.backspace || key.delete) {
        setInput((prev) => prev.slice(0, -1));
        return;
      }
      // Ctrl+C ya lo maneja App
      if (key.ctrl || key.meta) return;
      // Solo caracteres imprimibles, max 16 como Minecraft
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
        <Text dimColor>Modo Auth — Tab para volver a navegación/grid</Text>
      </Box>
    );
  }

  const isValid = input.trim().length >= 3;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <Box borderStyle="round" borderColor={focus ? theme.colors.focus : theme.colors.border} paddingX={3} paddingY={1} flexDirection="column" gap={1} width={40}>
        <Text bold color={theme.colors.primary}>◐ Iniciar sesión</Text>
        <Text color={theme.colors.muted}>Usuario offline (3-16 caracteres, a-z, 0-9, _)</Text>

        <Box marginTop={1} flexDirection="column" gap={1}>
          <Text color={theme.colors.muted}>Usuario:</Text>
          <Box borderStyle="single" borderColor={focus ? theme.colors.focus : theme.colors.border} paddingX={1}>
            <Text color={theme.colors.text}>{input}</Text>
            {focus && <Text color={theme.colors.focus}>█</Text>}
            {!focus && input.length === 0 && <Text dimColor>ej: AledEv</Text>}
          </Box>
          {!isValid && input.length > 0 && (
            <Text color="yellow">Mínimo 3 caracteres</Text>
          )}
        </Box>

        <Box marginTop={1} gap={1} justifyContent="center">
          <Box borderStyle="round" borderColor={isValid && focus ? 'green' : 'gray'} paddingX={1}>
            <Text color={isValid && focus ? 'green' : 'gray'} bold={isValid && focus}>
              {focus ? '↵ Entrar' : 'Tab para enfocar'}
            </Text>
          </Box>
          <Box borderStyle="round" borderColor="gray" paddingX={1}>
            <Text dimColor>Esc Volver</Text>
          </Box>
        </Box>
      </Box>
      <Text dimColor>Modo Auth — escribe tu nombre y pulsa Enter</Text>
      {submitted && <Text color="green">¡Bienvenido, {input}!</Text>}
    </Box>
  );
};
