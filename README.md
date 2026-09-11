# craftty

Terminal Minecraft launcher (TUI).

## Install

### Linux (binary)

No Bun required. Needs **Java** to launch the game.

```bash
# x86_64
curl -L -o craftty \
  https://github.com/aledx18/Craftty/releases/download/v0.1.0/craftty-linux-x64
chmod +x craftty
./craftty
```

```bash
# arm64
curl -L -o craftty \
  https://github.com/aledx18/Craftty/releases/download/v0.1.0/craftty-linux-arm64
chmod +x craftty
./craftty
```

Optional: `sudo install -m755 craftty /usr/local/bin/craftty`

All assets: [Releases](https://github.com/aledx18/Craftty/releases)

### From source

```bash
bun install
bun run dev
```

## Paths

| | prod | dev |
| --- | --- | --- |
| config | `~/.config/craftty` | `~/.config/craftty-dev` |
| data | `~/.local/share/craftty` | `~/.local/share/craftty-dev` |
