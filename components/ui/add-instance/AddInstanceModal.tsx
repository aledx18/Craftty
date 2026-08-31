import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { Select } from '@/components/ui/select/index.js'
import { TextInput } from '@/components/ui/text-input/index.js'
import { useTheme } from '@/components/ui/theme.js'
import { getInstancesDir } from '@/src/instanceFiles.js'
import { fetchReleasedVersions } from '@/src/minecraft/install.js'

export interface AddInstanceModalProps {
  focus?: boolean
  existingNames?: string[]
  onConfirm: (data: { name: string; version: string }) => void
  theme?: InkUITheme
}

function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 32)
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({
  focus = false,
  existingNames = [],
  onConfirm,
  theme: themeProp,
}) => {
  const ctxTheme = useTheme()
  const theme = themeProp ?? ctxTheme
  const [name, setName] = useState('')
  const [activeField, setActiveField] = useState<'name' | 'version'>('name')
  const [versions, setVersions] = useState<{ label: string; value: string }[]>([])
  const [versionIdx, setVersionIdx] = useState(0)
  const [versionsLoading, setVersionsLoading] = useState(true)
  const [versionsError, setVersionsError] = useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setVersionsLoading(true)
    fetchReleasedVersions()
      .then((list) => {
        if (cancelled) return
        const curated = list.slice(0, 30)
        const items = curated.map((v) => ({ label: v.id, value: v.id }))
        setVersions(items)
        const idx = items.findIndex((i) => i.value === '1.21.1')
        setVersionIdx(idx >= 0 ? idx : 0)
        setVersionsError(null)
      })
      .catch((e: any) => {
        if (cancelled) return
        setVersionsError(e.message ?? String(e))
        setVersions([{ label: '1.21.1', value: '1.21.1' }])
        setVersionIdx(0)
      })
      .finally(() => {
        if (!cancelled) setVersionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedVersion = versions[versionIdx]?.value ?? '1.21.1'
  const normalized = name.trim().toLowerCase()
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === normalized)
  const isNameValid =
    name.trim().length >= 3 && name.trim().length <= 32 && !isDuplicate && !versionsLoading

  useInput(
    (char, key) => {
      if (!focus) return
      if (key.tab) {
        setActiveField((p) => (p === 'name' ? 'version' : 'name'))
        return
      }
      // Name field: TextInput owns typing/Enter. Version: Select owns arrows.
    },
    { isActive: focus },
  )

  const nameFocused = focus && activeField === 'name'
  const versionFocused = focus && activeField === 'version'

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box
        borderStyle="round"
        borderColor={theme.colors.focus}
        paddingX={3}
        paddingY={1}
        flexDirection="column"
        gap={1}
        width={56}
      >
        <Text bold color={theme.colors.primary}>
          ⬡ New instance
        </Text>
        <Text color={theme.colors.muted}>Name and Minecraft version</Text>
        <Text dimColor>Install runs in the background after create</Text>

        <Box
          flexDirection="column"
          gap={1}
          marginTop={1}
          borderStyle="single"
          borderColor={nameFocused ? theme.colors.focus : theme.colors.border}
          paddingX={1}
          paddingY={1}
        >
          <Text color={nameFocused ? theme.colors.focus : theme.colors.muted} bold={nameFocused}>
            ■ Name {nameFocused ? '●' : ''}
          </Text>
          <TextInput
            value={name}
            onChange={(v) => setName(sanitizeName(v))}
            onSubmit={() => {
              if (isNameValid) onConfirm({ name: name.trim(), version: selectedVersion })
            }}
            placeholder="e.g. My Survival"
            focus={nameFocused}
            theme={theme}
          />
          {!isNameValid && name.length > 0 && (
            <Text color={theme.colors.error}>
              {isDuplicate ? 'An instance with that name already exists' : 'Minimum 3 characters'}
            </Text>
          )}
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text
            color={versionFocused ? theme.colors.focus : theme.colors.muted}
            bold={versionFocused}
          >
            ⬡ Minecraft {versionFocused ? '●' : ''}
          </Text>
          {versionsLoading ? (
            <Text dimColor>Loading versions...</Text>
          ) : versionsError ? (
            <Text color={theme.colors.warning}>
              ⚠ {versionsError.slice(0, 60)} (using fallback)
            </Text>
          ) : null}
          {!versionsLoading && (
            <Select
              items={versions}
              value={selectedVersion}
              onSelect={(item) => setVersionIdx(versions.findIndex((v) => v.value === item.value))}
              focus={versionFocused}
              theme={theme}
              maxVisible={8}
            />
          )}
          <Text dimColor>Java is resolved when you play</Text>
        </Box>

        <Box marginTop={1} gap={2} justifyContent="center">
          <Text
            backgroundColor={isNameValid ? theme.colors.success : undefined}
            color={isNameValid ? theme.colors.textInverse : theme.colors.muted}
            bold={isNameValid}
          >
            {` ${isDuplicate ? '✗ Duplicate' : isNameValid ? '↵ Create' : '✗ Invalid name'} `}
          </Text>
          <Text dimColor>Tab Switch · Esc Cancel</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Worlds at {getInstancesDir()}/&lt;id&gt; · game files in shared/</Text>
      </Box>
    </Box>
  )
}
