import { Box, render, Text, useApp, useInput, useWindowSize } from 'ink'
import { useEffect, useRef, useState } from 'react'
import { AddInstanceModal } from '@/components/ui/add-instance/index.js'
import { AuthPanel } from '@/components/ui/auth/index.js'
import { Confirm } from '@/components/ui/confirm/Confirm.js'
import { InstanceCard, InstanceGrid } from '@/components/ui/instance-card/index.js'
import { KeyHint } from '@/components/ui/key-hint/index.js'
import type { SidebarItem } from '@/components/ui/sidebar/index.js'
import { Sidebar } from '@/components/ui/sidebar/index.js'
import { Window } from '@/components/ui/window/index.js'
import { useAccount } from '@/src/hooks/useAccount.js'
import { useInstances } from '@/src/hooks/useInstances.js'
import { usePlayInstance } from '@/src/hooks/usePlayInstance.js'
import { useSettings } from '@/src/hooks/useSettings.js'
import {
  ensureInstanceFolder,
  ensureSharedPath,
  removeInstanceFolder,
} from '@/src/instanceFiles.js'
import { installVanilla } from '@/src/minecraft/install.js'
import { offlinePlayerUuid } from '@/src/minecraft/offlineUuid.js'
import type { Instance } from '@/src/storage.js'
import { registerTerminalCleanup, setupTerminal } from '@/src/terminal.js'

setupTerminal('craftty')
registerTerminalCleanup()

function useSidebarItems(instanceCount: number): SidebarItem[] {
  return [
    { id: 'instances', label: 'Instances', icon: '◧', badge: String(instanceCount) },
    { id: 'accounts', label: 'Accounts', icon: '◐' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ]
}

function App() {
  const { exit } = useApp()
  const { columns, rows } = useWindowSize()
  const { instances, addInstance, removeInstance, updateInstance } = useInstances()
  const { account, login, logout } = useAccount()
  const { settings } = useSettings()
  const abortRef = useRef<AbortController | null>(null)
  const { playInstance, playError, playRepair } = usePlayInstance({
    account,
    settings,
    updateInstance,
  })
  const SIDEBAR_ITEMS = useSidebarItems(instances.length)
  const [sidebarId, setSidebarId] = useState('instances')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [focus, setFocus] = useState<'sidebar' | 'grid' | 'auth' | 'add' | 'confirm'>('grid')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addPhase, setAddPhase] = useState<
    'validating' | 'downloading-assets' | 'downloading-libraries' | 'downloading-client'
  >('validating')
  const [addAssetsProgress, setAddAssetsProgress] = useState<{
    done: number
    total: number
    downloaded: number
    failed: number
    bytesDownloaded?: number
    totalBytes?: number
  } | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  // Calculate actual columns based on available width (card 32 + gap 1)
  const cols = Math.max(1, Math.floor(Math.max(32, (columns || 80) - 26) / 33))
  const count = instances.length

  useEffect(() => {
    if (count > 0 && selectedIdx >= count) setSelectedIdx(count - 1)
    if (count === 0) setSelectedIdx(0)
  }, [count, selectedIdx])

  useInput((input, key) => {
    // CRITICAL: Early-return FIRST for any mode where keystrokes must not leak to global handlers.
    // This prevents Ctrl+C from reaching `q` check, `tab` from changing panels, etc.
    if (focus === 'confirm') {
      if (key.escape) {
        setPendingDelete(null)
        setFocus('grid')
      }
      // Confirm handles its own input via internal useInput (Tab/Enter/y/n/Esc).
      return
    }
    if (focus === 'auth') {
      if (key.escape) {
        setFocus('sidebar')
        return
      }
      if (input === 'q') {
        exit()
        return
      }
      // AuthPanel handles its own input via internal useInput.
      return
    }
    if (focus === 'add') {
      if (key.escape) {
        if (addLoading) {
          abortRef.current?.abort()
          return
        }
        setAddError(null)
        setFocus('grid')
        return
      }
      // Tab toggles between name and version fields inside the modal.
      // Other keys (typing, arrows in select) are handled by AddInstanceModal's internal useInput.
      // AddInstanceModal must skip when this outer focus === 'add' returns early here.
      return
    }

    // From here on, focus is sidebar | grid (no modal/confirm open)
    if (input === 'q') {
      exit()
      return
    }
    // [+ New] with n
    if (focus === 'grid' && showGrid && (input === 'n' || input === 'N')) {
      setAddError(null)
      setAddLoading(false)
      setFocus('add')
      return
    }
    if (key.tab) {
      if (sidebarId === 'accounts') {
        setFocus((f) => (f === 'sidebar' ? 'auth' : 'sidebar'))
        return
      }
      if (sidebarId === 'instances') {
        setFocus((f) => (f === 'sidebar' ? 'grid' : 'sidebar'))
        return
      }
      // News / Settings: stay on the sidebar. Do not leak into grid handlers.
      return
    }

    if (focus === 'sidebar') {
      if (key.return) {
        if (sidebarId === 'accounts') setFocus('auth')
        else if (sidebarId === 'instances') setFocus('grid')
      }
      return
    }

    // Grid keys only apply on the Instances pane.
    if (sidebarId !== 'instances' || count === 0) return
    if (key.return) {
      const target = instances[selectedIdx]
      if (target) void playInstance(target)
      return
    }
    // Delete instance — destructive, requires confirmation
    if ((input === 'd' || input === 'D' || key.delete || key.backspace) && count > 0) {
      const target = instances[selectedIdx]
      if (target) {
        setPendingDelete(target.id)
        setFocus('confirm')
        return
      }
    }
    if (key.leftArrow) setSelectedIdx((i) => (i - 1 + count) % count)
    if (key.rightArrow) setSelectedIdx((i) => (i + 1) % count)
    if (key.upArrow)
      setSelectedIdx((i) => {
        const next = i - cols
        if (next < 0) {
          const lastRowStart = Math.floor((count - 1) / cols) * cols
          const col = i % cols
          const candidate = lastRowStart + col
          return candidate < count ? candidate : lastRowStart
        }
        return next
      })
    if (key.downArrow)
      setSelectedIdx((i) => {
        const next = i + cols
        return next >= count ? next % cols : next
      })
  })

  const showAuth = sidebarId === 'accounts'
  const showGrid = sidebarId === 'instances'
  const showAddModal = focus === 'add'

  return (
    <Window
      title="craftty"
      version="0.1.0"
      subtitle="TUI launcher"
      footer={
        <Box justifyContent="space-between" width="100%">
          <KeyHint
            keys={
              focus === 'confirm'
                ? [
                    { key: 'Tab', label: 'switch' },
                    { key: '↵', label: 'confirm' },
                    { key: 'Esc', label: 'cancel' },
                    { key: 'y/n', label: '' },
                  ]
                : focus === 'add'
                  ? [
                      { key: 'Tab', label: 'switch field' },
                      { key: '↵', label: 'create' },
                      { key: 'Esc', label: 'cancel' },
                    ]
                  : focus === 'grid' && sidebarId === 'instances'
                    ? [
                        { key: '←→↑↓', label: 'navigate' },
                        { key: 'n', label: 'new' },
                        { key: 'd', label: 'delete' },
                        { key: 'Tab', label: 'switch panel' },
                        { key: '↵', label: 'play' },
                        { key: 'q', label: 'quit' },
                      ]
                    : focus === 'auth'
                      ? [
                          { key: 'Tab', label: 'switch' },
                          { key: '↵', label: account ? 'logout' : 'login' },
                          { key: 'Esc', label: 'back' },
                          { key: 'q', label: 'quit' },
                        ]
                      : [
                          { key: '↑↓', label: 'navigate' },
                          { key: 'Tab', label: 'switch panel' },
                          { key: '↵', label: 'select' },
                          { key: 'q', label: 'quit' },
                        ]
            }
          />
          <Text dimColor>
            {focus === 'grid'
              ? '● instances'
              : focus === 'auth'
                ? '● auth'
                : focus === 'add'
                  ? '● new instance'
                  : focus === 'confirm'
                    ? '● delete'
                    : '● navigation'}
          </Text>
        </Box>
      }
    >
      <Box flexDirection="row" flexGrow={1} gap={1}>
        <Sidebar
          items={SIDEBAR_ITEMS}
          selectedId={sidebarId}
          onSelect={setSidebarId}
          title="craftty"
          focus={focus === 'sidebar'}
          height={Math.max(12, rows - 4)}
          account={account}
        />

        {/* Main content */}
        <Box flexDirection="column" flexGrow={1} paddingX={1} gap={1}>
          <Box justifyContent="space-between" marginTop={1}>
            <Box gap={1}>
              <Text bold color="white">
                {SIDEBAR_ITEMS.find((i) => i.id === sidebarId)?.label ?? '—'}
              </Text>
              {showGrid && <Text dimColor>· {instances.length} instances</Text>}
            </Box>
            {showGrid && (
              <Box gap={2}>
                <Text dimColor>⌕ search</Text>
                <Text dimColor>⇅ name</Text>
                <Text color="cyan">[+ New N]</Text>
              </Box>
            )}
          </Box>

          {/* Separator */}
          <Box
            borderStyle="single"
            borderTop
            borderBottom={false}
            borderLeft={false}
            borderRight={false}
          />

          {pendingDelete && focus === 'confirm' ? (
            (() => {
              const target = instances.find((i) => i.id === pendingDelete)
              return (
                <Confirm
                  title="Delete instance"
                  message={`Delete "${target?.name ?? pendingDelete}"?`}
                  detail="The instance folder (worlds, mods, configs) will be removed. Shared game files used by other instances are kept. This cannot be undone."
                  confirmLabel="Yes, delete everything"
                  cancelLabel="Cancel"
                  focus={true}
                  onConfirm={() => {
                    try {
                      removeInstance(pendingDelete)
                      setPendingDelete(null)
                      setFocus('grid')
                    } catch {
                      // Disk delete or index write failed — keep the confirm open.
                      // Closing would pretend the instance is gone.
                    }
                  }}
                  onCancel={() => {
                    setPendingDelete(null)
                    setFocus('grid')
                  }}
                />
              )
            })()
          ) : showAddModal ? (
            <AddInstanceModal
              focus={true}
              existingNames={instances.map((i) => i.name)}
              isLoading={addLoading}
              phase={addPhase}
              assetsProgress={addAssetsProgress ?? undefined}
              error={addError}
              onConfirm={async ({ name, version }) => {
                const id =
                  name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '') +
                  '-' +
                  crypto.randomUUID().slice(0, 8)
                const folder = ensureInstanceFolder(id)
                const shared = ensureSharedPath()
                const ac = new AbortController()
                abortRef.current = ac
                setAddLoading(true)
                setAddPhase('validating')
                setAddAssetsProgress(null)
                setAddError(null)
                try {
                  const resolved = await installVanilla(shared, version, {
                    signal: ac.signal,
                    onProgress: (p) => {
                      setAddPhase(p.phase)
                      setAddAssetsProgress(p)
                    },
                  })
                  const javaVersion = String(
                    resolved.javaVersion?.majorVersion ?? 21,
                  ) as Instance['javaVersion']
                  addInstance({
                    id,
                    name,
                    version,
                    loader: 'vanilla',
                    javaVersion,
                    folder,
                    status: 'ready',
                    createdAt: new Date().toISOString(),
                  })
                  setAddError(null)
                  setFocus('grid')
                } catch (e: any) {
                  // Clean up orphan folder so we don't leave empty instance dirs
                  try {
                    removeInstanceFolder(id)
                  } catch {}
                  if (e?.name === 'AbortError') {
                    setAddError(null)
                    setFocus('grid')
                  } else {
                    const msg = e?.error ? `${e.error}: ${e.message}` : (e?.message ?? String(e))
                    setAddError(msg)
                  }
                } finally {
                  abortRef.current = null
                  setAddLoading(false)
                }
              }}
            />
          ) : showAuth ? (
            <AuthPanel
              username={account?.username ?? ''}
              isLoggedIn={!!account}
              focus={focus === 'auth'}
              onLogin={(username) => {
                login({ username, uuid: offlinePlayerUuid(username) })
                setSidebarId('instances')
                setFocus('grid')
              }}
              onMicrosoftLogin={() => {
                const username = 'MicrosoftUser'
                login({ username, uuid: offlinePlayerUuid(username) })
                setSidebarId('instances')
                setFocus('grid')
              }}
              onLogout={() => {
                logout()
                setFocus('sidebar')
              }}
            />
          ) : showGrid ? (
            instances.length === 0 ? (
              <Box
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                flexGrow={1}
                gap={1}
              >
                <Text dimColor>No instances yet.</Text>
                <Text color="cyan">Press n to create one</Text>
              </Box>
            ) : (
              <InstanceGrid>
                {instances.map((inst, idx) => (
                  <InstanceCard
                    key={inst.id}
                    name={inst.name}
                    version={inst.version}
                    loader={inst.loader}
                    javaVersion={inst.javaVersion}
                    status={inst.status as any}
                    playTime={inst.playTime}
                    selected={idx === selectedIdx}
                    focused={focus === 'grid' && idx === selectedIdx}
                  />
                ))}
              </InstanceGrid>
            )
          ) : (
            <Box
              flexDirection="column"
              gap={1}
              paddingY={2}
              alignItems="center"
              justifyContent="center"
              flexGrow={1}
            >
              <Text color="gray" bold>
                ◈ {SIDEBAR_ITEMS.find((i) => i.id === sidebarId)?.label}
              </Text>
              <Text dimColor>This section is under construction — coming soon.</Text>
              <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={2}>
                <Text dimColor>↑↓ to switch section</Text>
              </Box>
            </Box>
          )}
          <Box flexGrow={1} />
          {showGrid && instances.length > 0 && (
            <Box
              borderStyle="single"
              borderColor="gray"
              borderTop
              borderBottom={false}
              borderLeft={false}
              borderRight={false}
              paddingTop={1}
              gap={2}
            >
              <Text dimColor>
                Selected: <Text color="white">{instances[selectedIdx]?.name ?? '—'}</Text> ·{' '}
                {instances[selectedIdx]?.version ?? ''} · {instances[selectedIdx]?.loader ?? ''}
                {playRepair ? (
                  <Text color="yellow">
                    {' '}
                    · repairing{' '}
                    {playRepair.phase === 'downloading-assets'
                      ? 'assets'
                      : playRepair.phase === 'downloading-libraries'
                        ? 'libraries'
                        : playRepair.phase === 'downloading-client'
                          ? 'client'
                          : 'version'}{' '}
                    {playRepair.downloaded}/{playRepair.total}
                    {playRepair.failed > 0 ? ` · ${playRepair.failed} failed` : ''}
                  </Text>
                ) : playError ? (
                  <Text color="red"> · {playError.slice(0, 80)}</Text>
                ) : null}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Window>
  )
}

const app = render(<App />, {
  exitOnCtrlC: false,
})
await app.waitUntilExit()
console.log('Done, thanks for using craftty!')
