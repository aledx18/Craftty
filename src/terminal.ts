/**
 * Control de estado de la terminal a bajo nivel (códigos ANSI).
 * Todo lo que se activa en setupTerminal() se revierte en restoreTerminal(),
 * en orden inverso.
 */

import { useStdout } from "ink";
import { useEffect, useState } from "react";

const ANSI = {
  altScreenEnter: '\x1b[?1049h',
  altScreenExit: '\x1b[?1049l',
  cursorHide: '\x1b[?25l',
  cursorShow: '\x1b[?25h',
  bracketedPasteEnter: '\x1b[?2004h',
  bracketedPasteExit: '\x1b[?2004l',
};

let restored = false;

export function setupTerminal(title = 'MC Launcher') {
  process.stdout.write(ANSI.altScreenEnter);
  process.stdout.write(ANSI.cursorHide);
  process.stdout.write(ANSI.bracketedPasteEnter);
  process.stdout.write(`\x1b]0;${title}\x07`);
}

export function restoreTerminal() {
  if (restored) return; // evita escribir dos veces si se llama por varias vías (SIGINT + exit)
  restored = true;

  process.stdout.write(ANSI.bracketedPasteExit);
  process.stdout.write(ANSI.cursorShow);
  process.stdout.write(ANSI.altScreenExit);
}

export function registerTerminalCleanup() {
  process.on('exit', restoreTerminal);
  process.on('SIGINT', () => {
    restoreTerminal();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    restoreTerminal();
    process.exit(0);
  });
}
