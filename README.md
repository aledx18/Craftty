# craftty

Terminal Minecraft launcher (TUI) built with Bun, Ink, and React.

## Install

### From source (dev)

```bash
bun install
bun run dev
```

### Standalone binary (local)

```bash
bun install
bun run build          # → dist/craftty
./dist/craftty
```

Cross-compile examples:

```bash
bun run build:linux-x64
bun run build:linux-arm64
bun run build:darwin-arm64
```

### Arch Linux (AUR-style PKGBUILDs)

Templates live in `packaging/aur/`:

| Package | What it does |
| --- | --- |
| `craftty-bin` | Downloads the prebuilt binary from GitHub Releases |
| `craftty-git` | Clones this repo and builds with Bun (`bun-bin` on AUR) |

Local test before publishing to AUR:

```bash
# After a real release exists (or override source= to a local file):
cd packaging/aur/craftty-bin
# set sha256sums_* from: sha256sum dist/craftty-linux-*
makepkg -si
```

```bash
cd packaging/aur/craftty-git
makepkg -si
```

### Homebrew (next)

Formula template: `packaging/homebrew/craftty.rb`.

After the first GitHub Release with Darwin/Linux assets:

1. Fill `sha256` values.
2. Publish a tap (e.g. `aledx18/homebrew-craftty`).
3. `brew install aledx18/craftty/craftty`

### Releases

Version lives in `package.json` (`0.1.0` → tag `v0.1.0`).

```bash
# working tree must be clean
bun run release:dry          # preview
bun run release              # tag v$(package.json version) + push → CI
bun run release 0.2.0        # bump version, commit, tag, push
bun run release --no-push    # tag only (push later)
```

CI (`.github/workflows/release.yml`) on `v*.*.*` tags:

1. Builds linux/darwin x64+arm64 binaries
2. Attaches them + `SHA256SUMS` to the GitHub Release

Assets: `craftty-linux-x64`, `craftty-linux-arm64`, `craftty-darwin-arm64`, `craftty-darwin-x64`.

## Runtime notes

- Config: `~/.config/craftty` (dev: `~/.config/craftty-dev`)
- Game data: `~/.local/share/craftty` (dev: `~/.local/share/craftty-dev`)
- Needs a usable `java` on `PATH` (or common install locations) to launch Minecraft.
