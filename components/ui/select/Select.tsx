import { Box, Text, useApp, useInput, useStdin } from 'ink'
import React, { useState } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { darkTheme } from '@/components/ui/_core.js'

export interface SelectItem<T = string> {
  label: string
  value: T
  disabled?: boolean
}

export interface SelectProps<T = string> {
  /** List of options */
  items: SelectItem<T>[]
  /** Called when the user presses Enter on an enabled item */
  onSelect: (item: SelectItem<T>) => void
  /** Controlled selected value — when provided, Select becomes controlled and onSelect is also called on arrow navigation */
  value?: T
  /** Whether this select captures keyboard input */
  focus?: boolean
  /** Max number of items visible at once. Default 8. When the list is longer, a scroll window follows the active item. */
  maxVisible?: number
  /** Theme override — defaults to darkTheme */
  theme?: InkUITheme
}

// ─── shared list display (with scroll window) ────────────────────────────────

interface ListDisplayProps<T> {
  items: SelectItem<T>[]
  activeIndex: number
  isFocused: boolean
  theme: InkUITheme
  maxVisible: number
}

function computeWindow(total: number, active: number, maxVisible: number) {
  if (total <= maxVisible) return { start: 0, end: total }
  // Keep `active` centered-ish in the window
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(0, active - half)
  const end = Math.min(total, start + maxVisible)
  start = Math.max(0, end - maxVisible)
  return { start, end }
}

function ListDisplay<T>({ items, activeIndex, isFocused, theme, maxVisible }: ListDisplayProps<T>) {
  const total = items.length
  const { start, end } = computeWindow(total, activeIndex, maxVisible)
  const visibleItems = items.slice(start, end)
  const hasMoreAbove = start > 0
  const hasMoreBelow = end < total

  return (
    <Box flexDirection="column">
      {hasMoreAbove && <Text dimColor> ↑ {start} more above</Text>}
      {visibleItems.map((item, i) => {
        const realIndex = start + i
        const isActive = realIndex === activeIndex
        const isDisabled = item.disabled === true

        let labelColor: string
        if (isDisabled) {
          labelColor = theme.colors.muted
        } else if (isActive && isFocused) {
          labelColor = theme.colors.focus
        } else {
          labelColor = theme.colors.text
        }

        const indicator = isActive && isFocused ? '❯ ' : '  '

        return (
          <Box key={String(item.value)}>
            <Text color={isActive && isFocused ? theme.colors.focus : theme.colors.muted}>
              {indicator}
            </Text>
            <Text color={labelColor} dimColor={isDisabled}>
              {item.label}
            </Text>
            {isDisabled ? <Text color={theme.colors.muted}>{' (disabled)'}</Text> : null}
          </Box>
        )
      })}
      {hasMoreBelow && <Text dimColor> ↓ {total - end} more below</Text>}
    </Box>
  )
}

// ─── focused inner (only mounts when raw mode is available) ──────────────────

interface FocusedSelectProps<T> {
  items: SelectItem<T>[]
  onSelect: (item: SelectItem<T>) => void
  value?: T
  theme: InkUITheme
  maxVisible: number
}

function FocusedSelect<T>({ items, onSelect, value, theme, maxVisible }: FocusedSelectProps<T>) {
  const { exit } = useApp()

  // Controlled vs uncontrolled
  const isControlled = value !== undefined
  const controlledIndex = isControlled ? items.findIndex((it) => it.value === value) : -1
  const firstEnabled = items.findIndex((it) => !it.disabled)
  const [internalIndex, setInternalIndex] = useState(
    controlledIndex >= 0 ? controlledIndex : Math.max(0, firstEnabled),
  )

  const activeIndex = isControlled && controlledIndex >= 0 ? controlledIndex : internalIndex

  const move = (dir: 1 | -1) => {
    const current = activeIndex
    let next = current + dir
    for (let i = 0; i < items.length; i++) {
      const wrapped = ((next % items.length) + items.length) % items.length
      if (!items[wrapped]!.disabled) {
        if (isControlled) {
          onSelect(items[wrapped]!)
        } else {
          setInternalIndex(wrapped)
        }
        return
      }
      next += dir
    }
  }

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
      return
    }
    if (key.upArrow) {
      move(-1)
      return
    }
    if (key.downArrow) {
      move(1)
      return
    }
    if (key.return) {
      const item = items[activeIndex]
      if (item && !item.disabled) onSelect(item)
      return
    }
  })

  return (
    <ListDisplay
      items={items}
      activeIndex={activeIndex}
      isFocused
      theme={theme}
      maxVisible={maxVisible}
    />
  )
}

// ─── public component ─────────────────────────────────────────────────────────

export function Select<T = string>({
  items,
  onSelect,
  value,
  focus = true,
  maxVisible = 8,
  theme = darkTheme,
}: SelectProps<T>) {
  const { isRawModeSupported } = useStdin()
  const canFocus = focus && isRawModeSupported

  if (canFocus) {
    return (
      <FocusedSelect
        items={items}
        onSelect={onSelect}
        value={value}
        theme={theme}
        maxVisible={maxVisible}
      />
    )
  }

  const activeIndex =
    value !== undefined
      ? Math.max(
          0,
          items.findIndex((it) => it.value === value),
        )
      : Math.max(
          0,
          items.findIndex((it) => !it.disabled),
        )
  return (
    <ListDisplay
      items={items}
      activeIndex={activeIndex}
      isFocused={false}
      theme={theme}
      maxVisible={maxVisible}
    />
  )
}
