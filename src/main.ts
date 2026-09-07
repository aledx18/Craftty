/**
 * Bootstrap entry — MUST stay tiny.
 *
 * ESM hoists static imports, so heavy modules (Ink, cfonts, React) must NOT be
 * imported here. We enter the alternate screen first, then load the real app.
 */
import { registerTerminalCleanup, setupTerminal } from '@/src/terminal.js'

setupTerminal('craftty')

// Storage cleanup only after alt-screen is up (fs I/O, no stdout noise expected).
const { clearEphemeralInstanceStatuses } = await import('@/src/storage.js')
registerTerminalCleanup(() => clearEphemeralInstanceStatuses())

await import('@/src/app.js')
