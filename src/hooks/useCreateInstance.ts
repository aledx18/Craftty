import { useCallback, useRef, useState } from 'react'
import {
  ensureInstanceFolder,
  ensureSharedPath,
  removeInstanceFolder,
} from '@/src/instanceFiles.js'
import type { InstallVanillaProgress } from '@/src/minecraft/install.js'
import { installVanilla } from '@/src/minecraft/install.js'
import type { Instance } from '@/src/storage.js'

export interface CreateJobProgress extends InstallVanillaProgress {
  instanceId: string
  instanceName: string
}

function makeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`
}

export function useCreateInstance(opts: {
  addInstance: (inst: Instance) => void
  removeInstance: (id: string) => void
  updateInstance: (id: string, patch: Partial<Instance>) => void
}) {
  const { addInstance, removeInstance, updateInstance } = opts
  const abortsRef = useRef(new Map<string, AbortController>())
  const [jobProgress, setJobProgress] = useState<CreateJobProgress | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const lastUiAt = useRef(0)

  const cancelCreate = useCallback((id: string) => {
    abortsRef.current.get(id)?.abort()
  }, [])

  const createInstance = useCallback(
    (data: { name: string; version: string }) => {
      setJobError(null)
      const id = makeId(data.name)
      const folder = ensureInstanceFolder(id)
      const ac = new AbortController()
      abortsRef.current.set(id, ac)

      addInstance({
        id,
        name: data.name,
        version: data.version,
        loader: 'vanilla',
        folder,
        status: 'updating',
        createdAt: new Date().toISOString(),
      })

      setJobProgress({
        instanceId: id,
        instanceName: data.name,
        phase: 'validating',
        done: 0,
        total: 1,
        downloaded: 0,
        failed: 0,
      })

      void (async () => {
        try {
          const resolved = await installVanilla(ensureSharedPath(), data.version, {
            signal: ac.signal,
            onProgress: (p) => {
              const now = Date.now()
              // Throttle UI to ~10fps so thousands of assets don't thrash Ink.
              if (now - lastUiAt.current < 100 && p.downloaded < p.total) return
              lastUiAt.current = now
              setJobProgress({
                instanceId: id,
                instanceName: data.name,
                ...p,
              })
            },
          })
          const javaVersion = String(
            resolved.javaVersion?.majorVersion ?? 21,
          ) as Instance['javaVersion']
          updateInstance(id, { status: 'ready', javaVersion })
          setJobProgress(null)
        } catch (e: any) {
          if (e?.name === 'AbortError') {
            try {
              removeInstance(id)
            } catch {
              try {
                removeInstanceFolder(id)
              } catch {}
            }
            setJobProgress(null)
            setJobError(null)
            return
          }
          updateInstance(id, { status: 'error' })
          setJobProgress(null)
          const msg = e?.error ? `${e.error}: ${e.message}` : (e?.message ?? String(e))
          setJobError(msg)
        } finally {
          abortsRef.current.delete(id)
        }
      })()

      return id
    },
    [addInstance, removeInstance, updateInstance],
  )

  return { createInstance, cancelCreate, jobProgress, jobError, setJobError }
}
