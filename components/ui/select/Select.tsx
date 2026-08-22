import React, { useState } from 'react';
import { Box, Text, useInput, useApp, useStdin } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

export interface SelectItem<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface SelectProps<T = string> {
  /** List of options */
  items: SelectItem<T>[];
  /** Called when the user presses Enter on an enabled item */
  onSelect: (item: SelectItem<T>) => void;
  /** Controlled selected value — when provided, Select becomes controlled and onSelect is also called on arrow navigation */
  value?: T;
  /** Whether this select captures keyboard input */
  focus?: boolean;
  /** Theme override — defaults to darkTheme */
  theme?: InkUITheme;
}

// ─── shared list display ─────────────────────────────────────────────────────

interface ListDisplayProps<T> {
  items: SelectItem<T>[];
  activeIndex: number;
  isFocused: boolean;
  theme: InkUITheme;
}

function ListDisplay<T>({
  items,
  activeIndex,
  isFocused,
  theme,
}: ListDisplayProps<T>) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const isActive   = i === activeIndex;
        const isDisabled = item.disabled === true;

        let labelColor: string;
        if (isDisabled) {
          labelColor = theme.colors.muted;
        } else if (isActive && isFocused) {
          labelColor = theme.colors.focus;
        } else {
          labelColor = theme.colors.text;
        }

        const indicator = isActive && isFocused ? '❯ ' : '  ';

        return (
          <Box key={String(item.value)}>
            <Text color={isActive && isFocused ? theme.colors.focus : theme.colors.muted}>
              {indicator}
            </Text>
            <Text color={labelColor} dimColor={isDisabled}>
              {item.label}
            </Text>
            {isDisabled ? (
              <Text color={theme.colors.muted}>{' (disabled)'}</Text>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

// ─── focused inner (only mounts when raw mode is available) ──────────────────

interface FocusedSelectProps<T> {
  items: SelectItem<T>[];
  onSelect: (item: SelectItem<T>) => void;
  value?: T;
  theme: InkUITheme;
}

function FocusedSelect<T>({ items, onSelect, value, theme }: FocusedSelectProps<T>) {
  const { exit } = useApp();

  // Controlled vs uncontrolled
  const isControlled = value !== undefined;
  const controlledIndex = isControlled ? items.findIndex((it) => it.value === value) : -1;
  const firstEnabled = items.findIndex((it) => !it.disabled);
  const [internalIndex, setInternalIndex] = useState(
    controlledIndex >= 0 ? controlledIndex : Math.max(0, firstEnabled)
  );

  const activeIndex = isControlled && controlledIndex >= 0 ? controlledIndex : internalIndex;

  const move = (dir: 1 | -1) => {
    const current = activeIndex;
    let next = current + dir;
    for (let i = 0; i < items.length; i++) {
      const wrapped = ((next % items.length) + items.length) % items.length;
      if (!items[wrapped]!.disabled) {
        if (isControlled) {
          onSelect(items[wrapped]!);
        } else {
          setInternalIndex(wrapped);
        }
        return;
      }
      next += dir;
    }
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') { exit(); return; }
    if (key.upArrow)   { move(-1); return; }
    if (key.downArrow) { move(1);  return; }
    if (key.return) {
      const item = items[activeIndex];
      if (item && !item.disabled) onSelect(item);
      return;
    }
  });

  return <ListDisplay items={items} activeIndex={activeIndex} isFocused theme={theme} />;
}

// ─── public component ─────────────────────────────────────────────────────────

export function Select<T = string>({
  items,
  onSelect,
  value,
  focus = true,
  theme = darkTheme,
}: SelectProps<T>) {
  const { isRawModeSupported } = useStdin();
  const canFocus = focus && isRawModeSupported;

  if (canFocus) {
    return <FocusedSelect items={items} onSelect={onSelect} value={value} theme={theme} />;
  }

  const activeIndex = value !== undefined
    ? Math.max(0, items.findIndex((it) => it.value === value))
    : Math.max(0, items.findIndex((it) => !it.disabled));
  return (
    <ListDisplay
      items={items}
      activeIndex={activeIndex}
      isFocused={false}
      theme={theme}
    />
  );
}
