import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'
import type { InkUITheme } from '@/components/ui/_core.js'
import { darkTheme } from '@/components/ui/_core.js'
import { ProgressBar } from '@/components/ui/progress-bar/index.js'
import { Select } from '@/components/ui/select/index.js'
import { getInstancesDir } from '@/src/instanceFiles.js'
import { fetchReleasedVersions } from '@/src/minecraft/install.js'

export interface AddInstanceModalProps {
  focus?: boolean
  existingNames?: string[]
  onConfirm: (data: { name: string; version: string }) => void
  isLoading?: boolean
  phase?: 'validating' | 'downloading-assets' | 'downloading-libraries' | 'downloading-client'
  assetsProgress?: {
    done: number
    total: number
    downloaded: number
    failed: number
    bytesDownloaded?: number
    totalBytes?: number
  }
  error?: string | null
  theme?: InkUITheme
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({
  focus = false,
  existingNames = [],
  onConfirm,
  isLoading = false,
  phase = 'validating',
  assetsProgress,
  error = null,
  theme = darkTheme,
}) => {
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
        // Curate: only the most recent ~30 releases so the list stays manageable.
        // Mojang publishes many minor releases; users almost never want 1.0 from 2011.
        const curated = list.slice(0, 30)
        const items = curated.map((v) => ({ label: v.id, value: v.id }))
        setVersions(items)
        // Default to 1.21.1 if present, else first item
        const idx = items.findIndex((i) => i.value === '1.21.1')
        setVersionIdx(idx >= 0 ? idx : 0)
        setVersionsError(null)
      })
      .catch((e: any) => {
        if (cancelled) return
        setVersionsError(e.message ?? String(e))
        // Fallback to single known version so user can still create
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
      if (!focus || isLoading) return
      // Esc and Tab are handled by App (global)
      if (key.tab) {
        setActiveField((p) => (p === 'name' ? 'version' : 'name'))
        return
      }
      // Version field: only Select handles arrows/Enter, don't process anything here
      if (activeField === 'version') return
      if (key.return && isNameValid) {
        onConfirm({ name: name.trim(), version: selectedVersion })
        return
      }
      if (key.backspace || key.delete) {
        setName((p) => p.slice(0, -1))
        return
      }
      if (key.ctrl || key.meta) return
      if (char && name.length < 32 && /^[a-zA-Z0-9 _-]$/.test(char)) setName((p) => p + char)
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
          <Text backgroundColor={nameFocused ? theme.colors.selection : undefined}>
            {name.length === 0 ? (
              <>
                <Text color={theme.colors.text}>{nameFocused ? '█' : ' '}</Text>
                <Text color="gray">e.g. My Survival</Text>
              </>
            ) : (
              <Text color={theme.colors.text}>
                {name}
                {nameFocused ? '█' : ''}
              </Text>
            )}
          </Text>
          {!isNameValid && name.length > 0 && (
            <Text color="red">
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
            <Text color="yellow">⚠ {versionsError.slice(0, 60)} (using fallback)</Text>
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
          <Text dimColor>Java will be auto-detected from version</Text>
        </Box>

        <Box marginTop={1} gap={2} justifyContent="center">
          <Text
            backgroundColor={isLoading ? 'yellow' : isNameValid ? 'green' : undefined}
            color={isLoading ? 'black' : isNameValid ? 'black' : 'gray'}
            bold={isNameValid || isLoading}
          >
            {` ${isLoading ? (phase === 'downloading-assets' ? '◐ Downloading assets...' : phase === 'downloading-libraries' ? '◐ Downloading libraries...' : phase === 'downloading-client' ? '◐ Downloading client...' : '◐ Validating version...') : isDuplicate ? '✗ Duplicate' : isNameValid ? '↵ Create' : '✗ Invalid name'} `}
          </Text>
          <Text dimColor>{isLoading ? 'Esc to cancel' : 'Tab Switch · Esc Cancel'}</Text>
        </Box>
        {isLoading &&
          (phase === 'downloading-assets' ||
            phase === 'downloading-libraries' ||
            phase === 'downloading-client') &&
          assetsProgress && (
            <Box
              flexDirection="column"
              gap={1}
              marginTop={1}
              borderStyle="single"
              borderColor={theme.colors.border}
              paddingX={1}
              paddingY={1}
            >
              <ProgressBar
                width={40}
                value={(assetsProgress.downloaded / Math.max(1, assetsProgress.total)) * 100}
                label={
                  phase === 'downloading-assets'
                    ? 'assets'
                    : phase === 'downloading-libraries'
                      ? 'libraries'
                      : 'client'
                }
              />
              <Box justifyContent="space-between">
                <Text dimColor>
                  {assetsProgress.downloaded}/{assetsProgress.total} files
                  {assetsProgress.failed > 0 && (
                    <Text color="red"> · {assetsProgress.failed} failed</Text>
                  )}
                </Text>
                {assetsProgress.bytesDownloaded !== undefined &&
                  assetsProgress.totalBytes !== undefined &&
                  assetsProgress.totalBytes > 0 && (
                    <Text dimColor>
                      {(assetsProgress.bytesDownloaded / 1024 / 1024).toFixed(1)}/
                      {(assetsProgress.totalBytes / 1024 / 1024).toFixed(1)} MB
                    </Text>
                  )}
              </Box>
            </Box>
          )}
        {error && (
          <Box marginTop={1} borderStyle="single" borderColor="red" paddingX={1}>
            <Text color="red">⚠ {error.slice(0, 80)}</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Will be created at {getInstancesDir()}/&lt;id&gt;</Text>
      </Box>
    </Box>
  )
}
