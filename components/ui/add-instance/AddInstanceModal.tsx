import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';
import { JAVA_VERSIONS } from '../../../src/storage.js';
import type { JavaVersion } from '../../../src/storage.js';
import { getInstancesDir } from '../../../src/instanceFiles.js';
import { Select } from '../select/index.js';

export interface AddInstanceModalProps {
  focus?: boolean;
  existingNames?: string[];
  onConfirm: (data: { name: string; javaVersion: JavaVersion }) => void;
  theme?: InkUITheme;
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({
  focus = false,
  existingNames = [],
  onConfirm,
  theme = darkTheme,
}) => {
  const [name, setName] = useState('');
  const [javaIdx, setJavaIdx] = useState(2);
  const [activeField, setActiveField] = useState<'name' | 'java'>('name');

  const javaVersion = JAVA_VERSIONS[javaIdx]!.value;
  const normalized = name.trim().toLowerCase();
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === normalized);
  const isNameValid = name.trim().length >= 3 && name.trim().length <= 32 && !isDuplicate;

  useInput(
    (char, key) => {
      if (!focus) return;
      // Esc y Tab los maneja App (global)
      if (key.tab) { setActiveField(p => p === 'name' ? 'java' : 'name'); return; }
      // Java field: solo Select maneja flechas/Enter, no procesamos nada acá
      if (activeField === 'java') return;
      if (key.return && isNameValid) { onConfirm({ name: name.trim(), javaVersion }); return; }
      if (key.backspace || key.delete) { setName(p => p.slice(0, -1)); return; }
      if (key.ctrl || key.meta) return;
      if (char && name.length < 32 && /^[a-zA-Z0-9 _-]$/.test(char)) setName(p => p + char);
    },
    { isActive: focus }
  );

  const nameFocused = focus && activeField === 'name';
  const javaFocused = focus && activeField === 'java';

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box borderStyle="round" borderColor={theme.colors.focus} paddingX={3} paddingY={1} flexDirection="column" gap={1} width={56}>
        <Text bold color={theme.colors.primary}>⬡ Nueva instancia</Text>
        <Text color={theme.colors.muted}>Nombre y Java — el resto es mock</Text>

        <Box flexDirection="column" gap={1} marginTop={1} borderStyle="single" borderColor={nameFocused ? theme.colors.focus : theme.colors.border} paddingX={1} paddingY={1}>
          <Text color={nameFocused ? theme.colors.focus : theme.colors.muted} bold={nameFocused}>■ Nombre {nameFocused ? '●' : ''}</Text>
          <Text backgroundColor={nameFocused ? theme.colors.selection : undefined} color={name.length === 0 ? 'gray' : theme.colors.text}>
            {' ' + (name.length === 0 ? 'ej: Mi Survival' : name).padEnd(30, ' ') + (nameFocused ? '█' : ' ') + ' '}
          </Text>
          {!isNameValid && name.length > 0 && (
            <Text color="red">{isDuplicate ? 'Ya existe una instancia con ese nombre' : 'Mínimo 3 caracteres'}</Text>
          )}
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text color={javaFocused ? theme.colors.focus : theme.colors.muted} bold={javaFocused}>⬡ Java {javaFocused ? '●' : ''}</Text>
          <Select
            items={JAVA_VERSIONS.map(j => ({ label: j.label, value: j.value }))}
            value={javaVersion}
            onSelect={item => setJavaIdx(JAVA_VERSIONS.findIndex(j => j.value === item.value))}
            focus={javaFocused}
            theme={theme}
          />
        </Box>

        <Box marginTop={1} gap={2} justifyContent="center">
          <Text backgroundColor={isNameValid ? 'green' : undefined} color={isNameValid ? 'black' : 'gray'} bold={isNameValid}>
            {` ${isDuplicate ? '✗ Duplicado' : isNameValid ? '↵ Crear' : '✗ Nombre inválido'} `}
          </Text>
          <Text dimColor>Tab Cambiar · Esc Cancelar</Text>
        </Box>
      </Box>
      <Box marginTop={1}><Text dimColor>Se creará en {getInstancesDir()}/&lt;id&gt;</Text></Box>
    </Box>
  );
};
