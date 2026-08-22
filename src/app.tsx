import { render, Box, Text, useInput, useApp, useWindowSize } from 'ink';
import { useState } from 'react';
import { setupTerminal, registerTerminalCleanup } from './terminal.js';
import { Window } from '../components/ui/window/index.js';
import { Sidebar } from '../components/ui/sidebar/index.js';
import type { SidebarItem } from '../components/ui/sidebar/index.js';
import { InstanceCard, InstanceGrid } from '../components/ui/instance-card/index.js';
import { KeyHint } from '../components/ui/key-hint/index.js';

setupTerminal('MC Launcher');
registerTerminalCleanup();

// ── Mock data tipo Prism ──────────────────────────────────
const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'instances', label: 'Instancias', icon: '◧', badge: '6' },
  { id: 'catalog', label: 'Catálogo', icon: '▦' },
  { id: 'accounts', label: 'Cuentas', icon: '◐' },
  { id: 'news', label: 'Noticias', icon: '✦' },
  { id: 'settings', label: 'Ajustes', icon: '⚙' },
];

const INSTANCES = [
  { id: 'skyfactory4', name: 'SkyFactory 4', version: '1.12.2', loader: 'forge', status: 'ready' as const, playTime: '42h' },
  { id: 'atm9', name: 'All The Mods 9', version: '1.20.1', loader: 'forge', status: 'ready' as const, playTime: '128h' },
  { id: 'vanilla121', name: 'Vanilla 1.21.1', version: '1.21.1', loader: 'vanilla', status: 'ready' as const, playTime: '12h' },
  { id: 'fabulously', name: 'Fabulously Opti', version: '1.20.4', loader: 'fabric', status: 'playing' as const, playTime: '6h' },
  { id: 'create-astral', name: 'Create: Astral', version: '1.19.2', loader: 'forge', status: 'updating' as const, playTime: '89h' },
  { id: 'hardcore', name: 'Hardcore Test', version: '1.21.1', loader: 'quilt', status: 'error' as const, playTime: '2h' },
];

function App() {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [sidebarId, setSidebarId] = useState('instances');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [focus, setFocus] = useState<'sidebar' | 'grid'>('grid');

  // Calcula columnas reales según ancho disponible (card 32 + gap 1)
  const cols = Math.max(1, Math.floor(Math.max(32, (columns || 80) - 26) / 33));
  const count = INSTANCES.length;

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    if (key.tab) {
      setFocus((f) => (f === 'grid' ? 'sidebar' : 'grid'));
      return;
    }

    if (focus === 'sidebar') {
      if (key.upArrow) {
        const idx = SIDEBAR_ITEMS.findIndex((i) => i.id === sidebarId);
        const next = (idx - 1 + SIDEBAR_ITEMS.length) % SIDEBAR_ITEMS.length;
        setSidebarId(SIDEBAR_ITEMS[next]!.id);
      }
      if (key.downArrow) {
        const idx = SIDEBAR_ITEMS.findIndex((i) => i.id === sidebarId);
        const next = (idx + 1) % SIDEBAR_ITEMS.length;
        setSidebarId(SIDEBAR_ITEMS[next]!.id);
      }
      if (key.return) {
        setFocus('grid');
      }
    } else {
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

  const showGrid = sidebarId === 'instances';

  return (
    <Window
      title="Minecraft-Terminal"
      version="0.1.0"
      subtitle="TUI Edition"
      footer={
        <Box justifyContent="space-between" width="100%">
          <KeyHint
            keys={
              focus === 'grid'
                ? [
                  { key: '←→', label: 'navegar' },
                  { key: 'Tab', label: 'cambiar panel' },
                  { key: '↵', label: 'jugar' },
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
          <Text dimColor>{focus === 'grid' ? '● instancias' : '● navegación'}</Text>
        </Box>
      }
    >
      <Box flexDirection="row" flexGrow={1} gap={1}>
        <Sidebar items={SIDEBAR_ITEMS} height={Math.max(12, rows - 4)} selectedId={sidebarId} title="Craftty" />

        {/* Main content */}
        <Box flexDirection="column" flexGrow={1} paddingX={1} gap={1}>
          <Box justifyContent="space-between" marginTop={1}>
            <Box gap={1}>
              <Text bold color="white">
                {SIDEBAR_ITEMS.find((i) => i.id === sidebarId)?.label ?? '—'}
              </Text>
              {showGrid && <Text dimColor>· {INSTANCES.length} instancias</Text>}
            </Box>
            {showGrid && (
              <Box gap={2}>
                <Text dimColor>⌕ buscar</Text>
                <Text dimColor>⇅ nombre</Text>
                <Text color="cyan">[+ Nueva]</Text>
              </Box>
            )}
          </Box>

          {/* Separador */}
          <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} />


          {showGrid ? (
            <InstanceGrid>
              {INSTANCES.map((inst, idx) => (
                <InstanceCard
                  key={inst.id}
                  name={inst.name}
                  version={inst.version}
                  loader={inst.loader}
                  status={inst.status}
                  playTime={inst.playTime}
                  selected={idx === selectedIdx}
                  focused={focus === 'grid' && idx === selectedIdx}
                />
              ))}
            </InstanceGrid>
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
          {showGrid && (
            <Box borderStyle="single" borderColor='gray' borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingTop={1} gap={2}>
              <Text dimColor>
                Seleccionada: <Text color="white">{INSTANCES[selectedIdx]!.name}</Text> · {INSTANCES[selectedIdx]!.version} · {INSTANCES[selectedIdx]!.loader}
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
