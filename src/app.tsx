import { render, Box, Text, useInput, useApp, useWindowSize } from 'ink';
import { useState, useEffect } from 'react';
import { setupTerminal, registerTerminalCleanup } from './terminal.js';
import { Window } from '../components/ui/window/index.js';
import { Sidebar } from '../components/ui/sidebar/index.js';
import type { SidebarItem } from '../components/ui/sidebar/index.js';
import { InstanceCard, InstanceGrid } from '../components/ui/instance-card/index.js';
import { KeyHint } from '../components/ui/key-hint/index.js';
import { AuthPanel } from '../components/ui/auth/index.js';
import { AddInstanceModal } from '../components/ui/add-instance/index.js';
import { Confirm } from '../components/ui/confirm/Confirm.js';
import { useInstances } from './hooks/useInstances.js';
import { useAccount } from './hooks/useAccount.js';
import { ensureInstanceFolder } from './instanceFiles.js';


setupTerminal('MC Launcher');
registerTerminalCleanup();

function useSidebarItems(instanceCount: number): SidebarItem[] {
  return [
    { id: 'instances', label: 'Instancias', icon: '◧', badge: String(instanceCount) },
    { id: 'catalog', label: 'Catálogo', icon: '▦' },
    { id: 'accounts', label: 'Cuentas', icon: '◐' },
    { id: 'news', label: 'Noticias', icon: '✦' },
    { id: 'settings', label: 'Ajustes', icon: '⚙' },
  ];
}

function App() {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const { instances, addInstance, removeInstance } = useInstances();
  const { account, login, logout } = useAccount();
  const SIDEBAR_ITEMS = useSidebarItems(instances.length);
  const [sidebarId, setSidebarId] = useState('instances');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [focus, setFocus] = useState<'sidebar' | 'grid' | 'auth' | 'add' | 'confirm'>('grid');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Calcula columnas reales según ancho disponible (card 32 + gap 1)
  const cols = Math.max(1, Math.floor(Math.max(32, (columns || 80) - 26) / 33));
  const count = instances.length;

  useEffect(() => {
    if (count > 0 && selectedIdx >= count) setSelectedIdx(count - 1);
    if (count === 0) setSelectedIdx(0);
  }, [count, selectedIdx]);

  useInput((input, key) => {
    if (focus === 'confirm') {
      // Deja que Confirm maneje Esc/Enter/Tab/y/n
      if (key.escape) {
        setPendingDelete(null);
        setFocus('grid');
        return;
      }
      return;
    }
    if (focus === 'add') {
      if (key.escape) {
        setFocus('grid');
        return;
      }
      return;
    }
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    // [+ Nueva] con n
    if (focus === 'grid' && showGrid && (input === 'n' || input === 'N')) {
      setFocus('add');
      return;
    }
    if (key.tab) {
      if (focus === 'auth') {
        return;
      }
      if (sidebarId === 'accounts') {
        if (focus === 'sidebar') setFocus('auth');
        else if (focus === 'grid') setFocus('auth');
        else setFocus('sidebar');
        return;
      }
      setFocus((f) => (f === 'sidebar' ? 'grid' : 'sidebar'));
      return;
    }

    if (focus === 'sidebar') {
      if (key.return) {
        if (sidebarId === 'accounts') setFocus('auth');
        else setFocus('grid');
      }
      return;
    }

    if (focus === 'auth') {
      if (key.escape) {
        setFocus('sidebar');
        return;
      }
      return;
    } else {
      if (count === 0) return;
      // Borrar instancia — destructivo, pide confirmación
      if ((input === 'd' || input === 'D' || key.delete || key.backspace) && count > 0) {
        const target = instances[selectedIdx];
        if (target) {
          setPendingDelete(target.id);
          setFocus('confirm');
          return;
        }
      }
      if (key.leftArrow) setSelectedIdx((i) => (i - 1 + count) % count);
      if (key.rightArrow) setSelectedIdx((i) => (i + 1) % count);
      if (key.upArrow) setSelectedIdx((i) => {
        const next = i - cols;
        if (next < 0) {
          const lastRowStart = Math.floor((count - 1) / cols) * cols;
          const col = i % cols;
          const candidate = lastRowStart + col;
          return candidate < count ? candidate : lastRowStart;
        }
        return next;
      });
      if (key.downArrow) setSelectedIdx((i) => {
        const next = i + cols;
        return next >= count ? next % cols : next;
      });
    }
  });

  const showAuth = sidebarId === 'accounts';
  const showGrid = sidebarId === 'instances';
  const isAuthFocus = focus === 'auth';
  const showAddModal = focus === 'add';

  return (
    <Window
      title="Minecraft-Terminal"
      version="0.1.0"
      subtitle="TUI Edition"
      footer={
        <Box justifyContent="space-between" width="100%">
          <KeyHint
            keys={
              focus === 'confirm'
                ? [
                  { key: 'Tab', label: 'cambiar' },
                  { key: '↵', label: 'confirmar' },
                  { key: 'Esc', label: 'cancelar' },
                  { key: 'y/n', label: '' },
                ]
                : focus === 'add'
                  ? [
                    { key: 'Tab', label: 'cambiar campo' },
                    { key: '↵', label: 'crear' },
                    { key: 'Esc', label: 'cancelar' },
                  ]
                  : focus === 'grid'
                  ? [
                    { key: '←→↑↓', label: 'navegar' },
                    { key: 'n', label: 'nueva' },
                    { key: 'Tab', label: 'cambiar panel' },
                    { key: '↵', label: 'jugar' },
                    { key: 'q', label: 'salir' },
                  ]
                  : focus === 'auth'
                    ? [
                      { key: 'Tab', label: 'cambiar' },
                      { key: '↵', label: account ? 'logout' : 'login' },
                      { key: 'Esc', label: 'volver' },
                      { key: 'q', label: 'salir' },
                    ]
                    : [
                      { key: '↑↓', label: 'navegar' },
                      { key: 'Tab', label: 'cambiar panel' },
                      { key: '↵', label: 'seleccionar' },
                      { key: 'q', label: 'salir' },
                    ]
            }
          />
          <Text dimColor>{focus === 'grid' ? '● instancias' : focus === 'auth' ? '● auth' : focus === 'add' ? '● nueva instancia' : focus === 'confirm' ? '● borrar' : '● navegación'}</Text>
        </Box>
      }
    >
      <Box flexDirection="row" flexGrow={1} gap={1}>
        <Sidebar
          items={SIDEBAR_ITEMS}
          selectedId={sidebarId}
          onSelect={setSidebarId}
          title="PRISM"
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
              {showGrid && <Text dimColor>· {instances.length} instancias</Text>}
            </Box>
            {showGrid && (
              <Box gap={2}>
                <Text dimColor>⌕ buscar</Text>
                <Text dimColor>⇅ nombre</Text>
                <Text color="cyan">[+ Nueva N]</Text>
              </Box>
            )}
          </Box>

          {/* Separador */}
          <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} />

          {pendingDelete && focus === 'confirm' ? (
            (() => {
              const target = instances.find((i) => i.id === pendingDelete);
              return (
                <Confirm
                  title="Borrar instancia"
                  message={`¿Borrar "${target?.name ?? pendingDelete}"?`}
                  detail="Se borrará la carpeta completa en ~/.local/share/craftty[-dev]/instances/<id> — incluye mundos, mods y configs. Esta acción no se puede deshacer."
                  confirmLabel="Sí, borrar todo"
                  cancelLabel="Cancelar"
                  focus={true}
                  onConfirm={() => {
                    try {
                      removeInstance(pendingDelete);
                    } catch {}
                    setPendingDelete(null);
                    setFocus('grid');
                  }}
                  onCancel={() => {
                    setPendingDelete(null);
                    setFocus('grid');
                  }}
                />
              );
            })()
          ) : showAddModal ? (
            <AddInstanceModal
              focus={true}
              existingNames={instances.map((i) => i.name)}
              onConfirm={({ name, javaVersion }) => {
                const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
                const folder = ensureInstanceFolder(id);
                addInstance({
                  id,
                  name,
                  version: '1.21.1',
                  loader: 'vanilla',
                  javaVersion,
                  folder,
                  status: 'ready',
                  createdAt: new Date().toISOString(),
                });
                setFocus('grid');
              }}
              onCancel={() => setFocus('grid')}
            />
          ) : showAuth ? (
            <AuthPanel
              username={account?.username ?? ''}
              isLoggedIn={!!account}
              focus={focus === 'auth'}
              onLogin={(username) => {
                const uuid = crypto.randomUUID();
                login({ username, uuid });
                setSidebarId('instances');
                setFocus('grid');
              }}
              onMicrosoftLogin={() => {
                const username = 'MicrosoftUser';
                login({ username, uuid: crypto.randomUUID() });
                setSidebarId('instances');
                setFocus('grid');
              }}
              onLogout={() => {
                logout();
                setFocus('sidebar');
              }}
              onCancel={() => setFocus('sidebar')}
            />
          ) : showGrid ? (
            instances.length === 0 ? (
              <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
                <Text dimColor>No hay instancias aún.</Text>
                <Text color="cyan">Pulsa [+ Nueva] para crear una</Text>
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
            <Box flexDirection="column" gap={1} paddingY={2} alignItems="center" justifyContent="center" flexGrow={1}>
              <Text color="gray" bold>
                ◈ {SIDEBAR_ITEMS.find((i) => i.id === sidebarId)?.label}
              </Text>
              <Text dimColor>Esta sección está en construcción — viene pronto.</Text>
              <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={2}>
                <Text dimColor>Tab para volver a instancias</Text>
              </Box>
            </Box>
          )}
          <Box flexGrow={1} />
          {showGrid && instances.length > 0 && (
            <Box borderStyle="single" borderColor='gray' borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingTop={1} gap={2}>
              <Text dimColor>
                Seleccionada: <Text color="white">{instances[selectedIdx]?.name ?? '—'}</Text> · {instances[selectedIdx]?.version ?? ''} · {instances[selectedIdx]?.loader ?? ''}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Window>
  );
}

const app = render(<App />, {
  exitOnCtrlC: false,
});
await app.waitUntilExit();
console.log('Listo, ¡gracias por usar MC Launcher!');
