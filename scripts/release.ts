/**
 * Tag + push a release. CI builds binaries and publishes the GitHub Release.
 *
 * Usage:
 *   bun run release              # uses package.json version → v0.1.0
 *   bun run release 0.2.0        # bumps package.json, then tags
 *   bun run release --dry-run
 *   bun run release --no-push
 */
import { $ } from 'bun'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dir, '..')
const pkgPath = path.join(ROOT, 'package.json')

type Args = {
  versionArg?: string
  dryRun: boolean
  push: boolean
}

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv.filter((a) => a.startsWith('-')))
  const positional = argv.filter((a) => !a.startsWith('-'))
  return {
    versionArg: positional[0],
    dryRun: flags.has('--dry-run'),
    push: !flags.has('--no-push'),
  }
}

function assertSemver(v: string): void {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(v)) {
    throw new Error(`invalid semver: ${v} (expected X.Y.Z)`)
  }
}

async function git(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(['git', ...cmd], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) {
    throw new Error(`git ${cmd.join(' ')} failed:\n${stderr || stdout}`)
  }
  return stdout.trim()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const pkg = (await Bun.file(pkgPath).json()) as { version: string; name: string }

  let version = pkg.version
  if (args.versionArg) {
    assertSemver(args.versionArg)
    version = args.versionArg
  } else {
    assertSemver(version)
  }

  const tag = `v${version}`

  // Working tree must be clean so the tag points at what we intend to ship.
  const dirty = await git(['status', '--porcelain'])
  if (dirty.length > 0) {
    throw new Error(
      `working tree is dirty — commit (or stash) first:\n${dirty}`,
    )
  }

  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch !== 'main' && branch !== 'master') {
    console.warn(`warning: tagging from branch "${branch}" (not main/master)`)
  }

  const head = await git(['rev-parse', '--short', 'HEAD'])
  const existing = await git(['tag', '-l', tag])
  if (existing === tag) {
    throw new Error(`tag ${tag} already exists locally`)
  }

  // Best-effort remote check (ok if offline / no remote tag fetch).
  try {
    await git(['fetch', '--tags', 'origin'])
    const remote = await git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])
    if (remote.length > 0) {
      throw new Error(`tag ${tag} already exists on origin`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists on origin')) {
      throw err
    }
    console.warn('warning: could not verify remote tags (continuing)')
  }

  if (args.versionArg && args.versionArg !== pkg.version) {
    pkg.version = version
    const next = `${JSON.stringify(pkg, null, 2)}\n`
    if (args.dryRun) {
      console.log(`[dry-run] would set package.json version → ${version}`)
    } else {
      await Bun.write(pkgPath, next)
      await git(['add', 'package.json'])
      await git(['commit', '-m', `chore(release): ${tag}`])
      console.log(`committed package.json version ${version}`)
    }
  } else if (pkg.version !== version) {
    throw new Error(`package.json version is ${pkg.version}, expected ${version}`)
  }

  console.log(`release ${pkg.name} ${tag} @ ${head} (${branch})`)

  if (args.dryRun) {
    console.log(`[dry-run] would: git tag -a ${tag} -m "Release ${tag}"`)
    if (args.push) {
      console.log(`[dry-run] would: git push origin HEAD && git push origin ${tag}`)
    }
    console.log('[dry-run] CI workflow Release would build + attach binaries')
    return
  }

  await git(['tag', '-a', tag, '-m', `Release ${tag}`])
  console.log(`created tag ${tag}`)

  if (args.push) {
    // Push commits first if we bumped version, then the tag (triggers workflow).
    await git(['push', 'origin', 'HEAD'])
    await git(['push', 'origin', tag])
    console.log(`pushed HEAD and ${tag} → origin`)
    console.log(`watch: https://github.com/aledx18/Craftty/actions`)
    console.log(`release: https://github.com/aledx18/Craftty/releases/tag/${tag}`)
  } else {
    console.log('tag is local only (--no-push). Push when ready:')
    console.log(`  git push origin HEAD && git push origin ${tag}`)
  }
}

try {
  await main()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
