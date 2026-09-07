/**
 * Central Nerd Font glyphs for the TUI.
 * Requires a Nerd Font patched font in the terminal (e.g. CaskaydiaCove NF, JetBrainsMono NF).
 *
 * Names follow common nf-* conventions for searchability.
 * Prefer this module over ad-hoc emoji/unicode in components.
 */
export const icons = {
  // Navigation / chrome
  chevronRight: '\u{e0b1}', //   (powerline-ish); fallback feel: nf-pl
  pointer: '\u{f0da}', //  nf-fa-caret_right
  mdChevronRight: '\u{f0142}', // 󰅂 nf-md-chevron_right
  circle: '\u{f111}', // 
  circleOutline: '\u{f10c}', // 
  bolt: '\u{f0e7}', //  nf-fa-bolt
  power: '\u{f011}', //  nf-fa-power_off

  // Actions
  play: '\u{f04b}', // 
  plus: '\u{f067}', // 
  trash: '\u{f1f8}', // 
  download: '\u{f019}', // 
  check: '\u{f00c}', // 
  close: '\u{f00d}', // 
  warn: '\u{f071}', // 
  error: '\u{f06a}', // 
  info: '\u{f05a}', // 
  clock: '\u{f017}', // 
  search: '\u{f002}', // 
  gear: '\u{f013}', // 

  // Identity
  user: '\u{f007}', // 
  userOutline: '\u{f2c0}', // 
  signIn: '\u{f090}', // 
  signOut: '\u{f08b}', // 

  // Minecraft / instances
  cube: '\u{f1b2}', //  nf-fa-cube
  cubes: '\u{f1b3}', //  nf-fa-cubes
  package: '\u{f487}', //  nf-oct-package
  folder: '\u{f07b}', // 
  gamepad: '\u{f11b}', // 
  server: '\u{f233}', // 
  layers: '\u{f5fd}', //  nf-fa-layer_group-ish / md
  hammer: '\u{f6e3}', //  nf-fa-hammer
  anvil: '\u{f6e3}',
  diamond: '\u{e22a}', //  approximate gem
  java: '\u{e738}', //  nf-dev-java
  terminal: '\u{f120}', // 

  // Loaders (distinct nf glyphs)
  loaderVanilla: '\u{f1b2}', // cube
  loaderFabric: '\u{f5fd}', // layers
  loaderForge: '\u{f6e3}', // hammer
  loaderQuilt: '\u{f89b}', // nf-fa-border_all-ish quilt feel
  loaderNeo: '\u{f0e7}', // bolt
} as const

export type IconName = keyof typeof icons

export function loaderIcon(loader?: string): string {
  switch (loader) {
    case 'fabric':
      return icons.loaderFabric
    case 'forge':
      return icons.loaderForge
    case 'quilt':
      return icons.loaderQuilt
    case 'neoforge':
      return icons.loaderNeo
    default:
      return icons.loaderVanilla
  }
}
