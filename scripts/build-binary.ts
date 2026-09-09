/**
 * Build a standalone craftty binary with Bun --compile.
 *
 * Ink optionally pulls react-devtools-core (DEV only).
 * cfonts loads fonts via dynamic require — we inline the three we use.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dir, '..')
const OUT_DIR = path.join(ROOT, 'dist')
const OUT_NAME = process.env.CRAFTTY_OUT ?? 'craftty'
const TARGET = process.env.CRAFTTY_TARGET // e.g. bun-linux-x64, bun-darwin-arm64

const FONT_NAMES = ['block', 'chrome', 'tiny'] as const

async function loadFontJson(name: string): Promise<string> {
  const file = path.join(ROOT, 'node_modules/cfonts/fonts', `${name}.json`)
  const text = await Bun.file(file).text()
  // Validate JSON so a corrupt font fails the build, not runtime.
  JSON.parse(text)
  return text
}

function cfontsFontsPlugin(): Bun.BunPlugin {
  return {
    name: 'cfonts-fonts-inline',
    setup(build) {
      build.onLoad({ filter: /cfonts[\\/]lib[\\/]GetFont\.js$/ }, async () => {
        const entries = await Promise.all(
          FONT_NAMES.map(async (name) => [name, await loadFontJson(name)] as const),
        )
        const fontsObject = entries.map(([name, json]) => `"${name}": ${json}`).join(',\n')
        return {
          contents: `
'use strict';
const fonts = {
${fontsObject}
};
const GetFont = (font) => {
  if (Object.prototype.hasOwnProperty.call(fonts, font)) return fonts[font];
  return false;
};
module.exports = exports = { GetFont };
`,
          loader: 'js',
        }
      })
    },
  }
}

/** Stub optional Ink devtools so production binaries never need the package. */
function reactDevtoolsStubPlugin(): Bun.BunPlugin {
  return {
    name: 'react-devtools-core-stub',
    setup(build) {
      build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
        path: 'react-devtools-core',
        namespace: 'devtools-stub',
      }))
      build.onLoad({ filter: /.*/, namespace: 'devtools-stub' }, () => ({
        contents: `
export default {
  initialize() {},
  connectToDevTools() {},
};
`,
        loader: 'js',
      }))
    },
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const outfile = path.join(OUT_DIR, OUT_NAME)

  const compile =
    TARGET != null && TARGET.length > 0
      ? {
          outfile,
          target: TARGET as
            | 'bun-linux-x64'
            | 'bun-linux-arm64'
            | 'bun-windows-x64'
            | 'bun-darwin-x64'
            | 'bun-darwin-arm64'
            | 'bun-linux-x64-baseline'
            | 'bun-linux-arm64-musl',
        }
      : { outfile }

  const result = await Bun.build({
    entrypoints: [path.join(ROOT, 'src/main.ts')],
    target: 'bun',
    // compile implies production minify in CLI; keep env honest for Ink.
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.DEV': JSON.stringify('false'),
    },
    plugins: [cfontsFontsPlugin(), reactDevtoolsStubPlugin()],
    compile,
  })

  if (!result.success) {
    console.error('craftty binary build failed:')
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }

  const stat = await Bun.file(outfile).size
  console.log(`built ${outfile} (${(stat / (1024 * 1024)).toFixed(1)} MiB)`)
}

await main()
