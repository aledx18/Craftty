import { Box, render, Text, useApp, useInput, useWindowSize } from 'ink'
import { useEffect, useMemo, useState } from 'react'
import { AddInstanceModal } from '@/components/ui/add-instance/index.js'
import { AuthPanel } from '@/components/ui/auth/index.js'
import { Confirm } from '@/components/ui/confirm/Confirm.js'
import { InstanceCard, InstanceGrid } from '@/components/ui/instance-card/index.js'
import { KeyHint } from '@/components/ui/key-hint/index.js'
import type { SplashMenuItem } from '@/components/ui/splash/index.js'
import { SplashScreen } from '@/components/ui/splash/index.js'
import { ThemeProvider, useTheme } from '@/components/ui/theme.js'
import { Window } from '@/components/ui/window/index.js'
import { useAccount } from '@/src/hooks/useAccount.js'
import { useCreateInstance } from '@/src/hooks/useCreateInstance.js'
import { useInstances } from '@/src/hooks/useInstances.js'
import { usePlayInstance } from '@/src/hooks/usePlayInstance.js'
import { useSettings } from '@/src/hooks/useSettings.js'
import type { InstallPhase } from '@/src/minecraft/install.js'
import { offlinePlayerUuid } from '@/src/minecraft/offlineUuid.js'
import { clearEphemeralInstanceStatuses } from '@/src/storage.js'
import { registerTerminalCleanup, setupTerminal } from '@/src/terminal.js'

setupTerminal('craftty')
registerTerminalCleanup(() => clearEphemeralInstanceStatuses())

function phaseLabel(phase: InstallPhase): string {
  switch (phase) {
    case 'downloading-assets':
      return 'assets'
    case 'downloading-libraries':
      return 'libraries'
    case 'downloading-client':
      return 'client'
    default:
      return 'version'
  }
}

type Screen = 'splash' | 'auth' | 'main'
type MainFocus = 'grid' | 'add' | 'confirm'

function App() {
  const theme = useTheme()
  const { exit } = useApp()
  const { columns } = useWindowSize()
  const { instances, addInstance, removeInstance, updateInstance } = useInstances()
  const { account, login, logout } = useAccount()
  const { settings } = useSettings()
  const { playInstance, playError, playRepair } = usePlayInstance({
    account,
    settings,
    updateInstance,
  })
  const { createInstance, cancelCreate, jobProgress, jobError } = useCreateInstance({
    addInstance,
    removeInstance,
    updateInstance,
  })

  // Start on splash (LazyVim-style). Main is the bordered window without sidebar.
  const [screen, setScreen] = useState<Screen>('splash')
  const [mainFocus, setMainFocus] = useState<MainFocus>('grid')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // Full width cards (no sidebar)
  const cols = Math.max(1, Math.floor(Math.max(32, (columns || 80) - 4) / 33))
  const count = instances.length
  const selected = instances[selectedIdx]

  const splashMenu: SplashMenuItem[] = useMemo(() => {
    const items: SplashMenuItem[] = []
    if (account) {
      items.push(
        { key: 'i', label: 'Instances', icon: '◧' },
        { key: 'n', label: 'New instance', icon: '✦' },
        { key: 'a', label: 'Account', icon: '◐' },
      )
    } else {
      items.push({ key: 'a', label: 'Sign in (offline)', icon: '◐' })
    }
    items.push(
      { key: 's', label: 'Settings', icon: '⚙', disabled: true, hint: 'soon' },
      { key: 'q', label: 'Quit', icon: '⌘' },
    )
    return items
  }, [account])

  useEffect(() => {
    if (count > 0 && selectedIdx >= count) setSelectedIdx(count - 1)
    if (count === 0) setSelectedIdx(0)
  }, [count, selectedIdx])

  useInput((input, key) => {
    if (screen === 'splash') return // SplashScreen owns keys

    if (screen === 'auth') {
      if (key.escape) {
        setScreen('splash')
        return
      }
      if (input === 'q') {
        exit()
        return
      }
      return
    }

    // screen === 'main'
    if (mainFocus === 'confirm') {
      if (key.escape) {
        setPendingDelete(null)
        setMainFocus('grid')
      }
      return
    }
    if (mainFocus === 'add') {
      if (key.escape) {
        setMainFocus('grid')
        return
      }
      return
    }

    if (key.escape) {
      setScreen('splash')
      return
    }
    if (input === 'q') {
      exit()
      return
    }
    if (input === 'a' || input === 'A') {
      setScreen('auth')
      return
    }
    if (input === 'n' || input === 'N') {
      setMainFocus('add')
      return
    }
    if ((input === 'c' || input === 'C') && selected?.status === 'updating') {
      cancelCreate(selected.id)
      return
    }
    if (count === 0) return
    if (key.return) {
      if (selected && selected.status !== 'updating') void playInstance(selected)
      return
    }
    if ((input === 'd' || input === 'D' || key.delete || key.backspace) && selected) {
      if (selected.status === 'updating') cancelCreate(selected.id)
      setPendingDelete(selected.id)
      setMainFocus('confirm')
      return
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

  const activeProgress = jobProgress ?? playRepair
  const footerError = jobError ?? playError

  if (screen === 'splash') {
    return (
      <SplashScreen
        accountName={account?.username}
        instanceCount={instances.length}
        menu={splashMenu}
        focus={true}
        onAction={(key) => {
          if (key === 'q') {
            exit()
            return
          }
          if (key === 'a') {
            setScreen('auth')
            return
          }
          if (key === 'i') {
            if (!account) {
              setScreen('auth')
              return
            }
            setMainFocus('grid')
            setScreen('main')
            return
          }
          if (key === 'n') {
            if (!account) {
              setScreen('auth')
              return
            }
            setMainFocus('add')
            setScreen('main')
            return
          }
        }}
      />
    )
  }

  if (screen === 'auth') {
    return (
      <Box flexDirection="column" flexGrow={1} width="100%" height="100%">
        <AuthPanel
          username={account?.username ?? ''}
          isLoggedIn={!!account}
          focus={true}
          onLogin={(username) => {
            login({ username, uuid: offlinePlayerUuid(username) })
            setScreen('splash')
          }}
          onMicrosoftLogin={() => {
            login({ username: 'MicrosoftUser', uuid: offlinePlayerUuid('MicrosoftUser') })
            setScreen('splash')
          }}
          onLogout={() => {
            logout()
            setScreen('splash')
          }}
        />
        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>Esc back to home · q quit</Text>
        </Box>
      </Box>
    )
  }

  // ── main: bordered window, no sidebar ─────────────────────────────────────
  return (
    <Window
      title="craftty"
      version="0.1.0"
      subtitle={account ? account.username : 'guest'}
      footer={
        <Box justifyContent="space-between" width="100%">
          <KeyHint
            keys={
              mainFocus === 'confirm'
                ? [
                    { key: 'Tab', label: 'switch' },
                    { key: '↵', label: 'confirm' },
                    { key: 'Esc', label: 'cancel' },
                    { key: 'y/n', label: '' },
                  ]
                : mainFocus === 'add'
                  ? [
                      { key: 'Tab', label: 'switch field' },
                      { key: '↵', label: 'create' },
                      { key: 'Esc', label: 'cancel' },
                    ]
                  : [
                      { key: '←→↑↓', label: 'navigate' },
                      { key: 'n', label: 'new' },
                      { key: 'd', label: 'delete' },
                      ...(selected?.status === 'updating'
                        ? [{ key: 'c', label: 'cancel install' }]
                        : []),
                      { key: '↵', label: 'play' },
                      { key: 'a', label: 'account' },
                      { key: 'Esc', label: 'home' },
                      { key: 'q', label: 'quit' },
                    ]
            }
          />
          <Text dimColor>
            {mainFocus === 'add' ? '● new' : mainFocus === 'confirm' ? '● delete' : '● instances'}
          </Text>
        </Box>
      }
    >
      <Box flexDirection="column" flexGrow={1} paddingX={1} gap={1}>
        <Box justifyContent="space-between" marginTop={1}>
          <Box gap={1}>
            <Text bold color={theme.colors.text}>
              Instances
            </Text>
            <Text dimColor>· {instances.length}</Text>
          </Box>
          <Text color={theme.colors.primary}>[n] new</Text>
        </Box>

        <Box
          borderStyle="single"
          borderTop
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
        />

        {pendingDelete && mainFocus === 'confirm' ? (
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
                    if (target?.status === 'updating') cancelCreate(pendingDelete)
                    removeInstance(pendingDelete)
                    setPendingDelete(null)
                    setMainFocus('grid')
                  } catch {
                    // keep confirm open
                  }
                }}
                onCancel={() => {
                  setPendingDelete(null)
                  setMainFocus('grid')
                }}
              />
            )
          })()
        ) : mainFocus === 'add' ? (
          <AddInstanceModal
            focus={true}
            existingNames={instances.map((i) => i.name)}
            onConfirm={({ name, version }) => {
              createInstance({ name, version })
              setMainFocus('grid')
              setSelectedIdx(instances.length)
            }}
          />
        ) : instances.length === 0 ? (
          <Box
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            flexGrow={1}
            gap={1}
          >
            <Text dimColor>No instances yet.</Text>
            <Text color={theme.colors.primary}>Press n to create one</Text>
          </Box>
        ) : (
          <InstanceGrid>
            {instances.map((inst, idx) => {
              const isThisJob = jobProgress?.instanceId === inst.id
              const progressLabel =
                isThisJob && jobProgress
                  ? `${phaseLabel(jobProgress.phase)} ${jobProgress.downloaded}/${jobProgress.total}`
                  : undefined
              return (
                <InstanceCard
                  key={inst.id}
                  name={inst.name}
                  version={inst.version}
                  loader={inst.loader}
                  javaVersion={inst.javaVersion}
                  status={inst.status as any}
                  progressLabel={progressLabel}
                  playTime={inst.playTime}
                  selected={idx === selectedIdx}
                  focused={mainFocus === 'grid' && idx === selectedIdx}
                />
              )
            })}
          </InstanceGrid>
        )}

        <Box flexGrow={1} />
        {mainFocus === 'grid' && instances.length > 0 && (
          <Box
            borderStyle="single"
            borderColor={theme.colors.border}
            borderTop
            borderBottom={false}
            borderLeft={false}
            borderRight={false}
            paddingTop={1}
          >
            <Text dimColor>
              Selected: <Text color={theme.colors.text}>{selected?.name ?? '—'}</Text> ·{' '}
              {selected?.version ?? ''} · {selected?.loader ?? ''}
              {activeProgress ? (
                <Text color={theme.colors.warning}>
                  {' '}
                  · {jobProgress ? 'installing' : 'repairing'}{' '}
                  {jobProgress ? `${jobProgress.instanceName} ` : ''}
                  {phaseLabel(activeProgress.phase)} {activeProgress.downloaded}/
                  {activeProgress.total}
                  {activeProgress.failed > 0 ? ` · ${activeProgress.failed} failed` : ''}
                  {jobProgress ? ' · c cancel' : ''}
                </Text>
              ) : footerError ? (
                <Text color={theme.colors.error}> · {footerError.slice(0, 80)}</Text>
              ) : null}
            </Text>
          </Box>
        )}
      </Box>
    </Window>
  )
}

const app = render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  { exitOnCtrlC: false },
)
await app.waitUntilExit()
console.log('Done, thanks for using craftty!')
