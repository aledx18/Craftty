import { Box, Text, useInput, useStdin } from 'ink'
import type React from 'react'
import { useState } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { useTheme } from '@/components/ui/theme.js'

export interface TextInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  password?: boolean
  focus?: boolean
  label?: string
  theme?: InkUITheme
}

interface DisplayProps {
  value: string
  placeholder: string
  password: boolean
  isFocused: boolean
  cursor: number
  theme: InkUITheme
}

const InputDisplay: React.FC<DisplayProps> = ({
  value,
  placeholder,
  password,
  isFocused,
  cursor,
  theme,
}) => {
  const display = password ? '*'.repeat(value.length) : value
  const isEmpty = value.length === 0

  const cursorBlock = (char: string) => (
    <Text key="cursor" color={theme.colors.focus} inverse>
      {char}
    </Text>
  )

  if (!isFocused) {
    return isEmpty ? <Text color={theme.colors.muted}>{placeholder}</Text> : <Text>{display}</Text>
  }

  if (isEmpty) {
    if (placeholder.length === 0) return cursorBlock(' ')
    return (
      <Box>
        {cursorBlock(placeholder[0] ?? ' ')}
        <Text key="rest" color={theme.colors.muted}>
          {placeholder.slice(1)}
        </Text>
      </Box>
    )
  }

  const before = display.slice(0, cursor)
  const at = display[cursor] ?? ' '
  const after = display.slice(cursor + 1)

  return (
    <Box>
      {before ? <Text key="before">{before}</Text> : null}
      {cursorBlock(at)}
      {after ? <Text key="after">{after}</Text> : null}
    </Box>
  )
}

interface FocusedInputProps extends TextInputProps {
  theme: InkUITheme
}

const FocusedInput: React.FC<FocusedInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  password = false,
  theme,
}) => {
  const [cursor, setCursor] = useState(value.length)

  useInput((input, key) => {
    if (key.leftArrow) {
      setCursor((c) => Math.max(0, c - 1))
      return
    }
    if (key.rightArrow) {
      setCursor((c) => Math.min(value.length, c + 1))
      return
    }

    if (key.backspace || key.delete) {
      if (cursor === 0) return
      onChange(value.slice(0, cursor - 1) + value.slice(cursor))
      setCursor((c) => c - 1)
      return
    }

    if (key.return) {
      onSubmit?.(value)
      return
    }
    if (key.ctrl || key.meta || key.escape || key.tab) return

    onChange(value.slice(0, cursor) + input + value.slice(cursor))
    setCursor((c) => c + input.length)
  })

  return (
    <InputDisplay
      value={value}
      placeholder={placeholder}
      password={password}
      isFocused
      cursor={cursor}
      theme={theme}
    />
  )
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  password = false,
  focus = true,
  label,
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const { isRawModeSupported } = useStdin()
  const canFocus = focus && isRawModeSupported

  return (
    <Box>
      {label ? <Text color={theme.colors.muted}>{label} </Text> : null}
      <Text color={theme.colors.border}>{'❯ '}</Text>
      {canFocus ? (
        <FocusedInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          password={password}
          focus={focus}
          theme={theme}
        />
      ) : (
        <InputDisplay
          value={value}
          placeholder={placeholder}
          password={password}
          isFocused={false}
          cursor={value.length}
          theme={theme}
        />
      )}
    </Box>
  )
}
