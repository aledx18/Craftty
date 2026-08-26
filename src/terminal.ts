/**
 * Low-level terminal state control (ANSI codes).
 * Everything activated in setupTerminal() is reverted in restoreTerminal(),
 * in reverse order.
 */

const ANSI = {
  altScreenEnter: '\x1b[?1049h',
  altScreenExit: '\x1b[?1049l',
  cursorHide: '\x1b[?25l',
  cursorShow: '\x1b[?25h',
  bracketedPasteEnter: '\x1b[?2004h',
  bracketedPasteExit: '\x1b[?2004l',
}

let restored = false

export function setupTerminal(title = 'craftty') {
  process.stdout.write(ANSI.altScreenEnter)
  process.stdout.write(ANSI.cursorHide)
  process.stdout.write(ANSI.bracketedPasteEnter)
  process.stdout.write(`\x1b]0;${title}\x07`)
}

export function restoreTerminal() {
  if (restored) return // prevents double-write if called from multiple paths (SIGINT + exit)
  restored = true

  process.stdout.write(ANSI.bracketedPasteExit)
  process.stdout.write(ANSI.cursorShow)
  process.stdout.write(ANSI.altScreenExit)
}

export function registerTerminalCleanup() {
  process.on('exit', restoreTerminal)
  // SIGINT: ignore — only 'q' closes the app.
  // restoreTerminal() runs on 'exit' when the app closes normally.
  process.on('SIGINT', () => {})
  process.on('SIGTERM', () => {
    restoreTerminal()
    process.exit(0)
  })
}
