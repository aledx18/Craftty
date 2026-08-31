import type { ChildProcess } from 'node:child_process'
import { useCallback, useRef, useState } from 'react'
import { ensureSharedPath } from '@/src/instanceFiles.js'
import type { InstallVanillaProgress } from '@/src/minecraft/install.js'
import { installVanilla } from '@/src/minecraft/install.js'
import type { JavaRuntime } from '@/src/minecraft/java.js'
import { resolveJava } from '@/src/minecraft/java.js'
import { launchInstance } from '@/src/minecraft/launch.js'
import type { Account, Instance, Settings } from '@/src/storage.js'

export function usePlayInstance(opts: {
  account: Account | null
  settings: Settings
  updateInstance: (id: string, patch: Partial<Instance>) => void
}) {
  const { account, settings, updateInstance } = opts
  const playingRef = useRef<Set<string>>(new Set())
  const repairingRef = useRef(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const [playRepair, setPlayRepair] = useState<InstallVanillaProgress | null>(null)

  const attachGameProcess = useCallback(
    (inst: Instance, child: ChildProcess) => {
      playingRef.current.add(inst.id)
      updateInstance(inst.id, { status: 'playing' })
      child.on('exit', () => {
        playingRef.current.delete(inst.id)
        updateInstance(inst.id, { status: 'ready' })
      })
      child.on('error', (e) => {
        playingRef.current.delete(inst.id)
        updateInstance(inst.id, { status: 'error' })
        setPlayError(e.message)
      })
    },
    [updateInstance],
  )

  const playInstance = useCallback(
    async (inst: Instance) => {
      setPlayError(null)
      setPlayRepair(null)
      if (!account) {
        setPlayError('Log in first (Accounts)')
        return
      }
      // Only trust in-memory playing set. Disk "playing" can be stale after craftty restart.
      if (playingRef.current.has(inst.id)) return
      if (repairingRef.current) {
        setPlayError('Already repairing game files')
        return
      }

      let java: JavaRuntime
      try {
        const required = Number(inst.javaVersion) || 21
        java = await resolveJava(required)
      } catch (e: any) {
        updateInstance(inst.id, { status: 'error' })
        setPlayError(e?.message ?? String(e))
        return
      }

      try {
        const child = await launchInstance({
          instance: inst,
          account,
          settings,
          javaPath: java.path,
        })
        attachGameProcess(inst, child)
        return
      } catch {
        // Launch failed — most often missing/corrupt files. Repair into shared, then retry once.
      }

      repairingRef.current = true
      updateInstance(inst.id, { status: 'updating' })
      try {
        await installVanilla(ensureSharedPath(), inst.version, {
          onProgress: setPlayRepair,
        })
        const child = await launchInstance({
          instance: inst,
          account,
          settings,
          javaPath: java.path,
        })
        setPlayRepair(null)
        attachGameProcess(inst, child)
      } catch (e: any) {
        updateInstance(inst.id, { status: 'error' })
        setPlayRepair(null)
        const msg = e?.error ? `${e.error}: ${e.message}` : (e?.message ?? String(e))
        setPlayError(msg)
      } finally {
        repairingRef.current = false
      }
    },
    [account, settings, updateInstance, attachGameProcess],
  )

  return { playInstance, playError, playRepair }
}
