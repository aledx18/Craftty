import type { ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { launch } from '@xmcl/core'
import { getSharedPath } from '@/src/instanceFiles.js'
import type { Account, Instance, Settings } from '@/src/storage.js'

function versionJsonPath(root: string, versionId: string): string {
  return path.join(root, 'versions', versionId, `${versionId}.json`)
}

/**
 * Prefer the shared store. Old instances that still have a local
 * versions/<id>/<id>.json keep using their own folder so pepo-style
 * installs keep launching.
 */
export function resolveResourcePath(instance: Instance, shared = getSharedPath()): string {
  if (fs.existsSync(versionJsonPath(shared, instance.version))) return shared
  if (fs.existsSync(versionJsonPath(instance.folder, instance.version))) return instance.folder
  return shared
}

export async function launchInstance(opts: {
  instance: Instance
  account: Account
  settings: Settings
  javaPath: string
}): Promise<ChildProcess> {
  const { instance, account, settings, javaPath } = opts
  const resourcePath = resolveResourcePath(instance)

  const child = await launch({
    gamePath: instance.folder,
    resourcePath,
    javaPath,
    version: instance.version,
    minMemory: settings.memoryMinMB,
    maxMemory: settings.memoryMaxMB,
    gameProfile: {
      name: account.username,
      id: account.uuid,
    },
    accessToken: '0',
    userType: 'mojang',
    launcherName: 'craftty',
    launcherBrand: 'craftty',
    extraExecOption: {
      cwd: instance.folder,
      detached: true,
      stdio: 'ignore',
    },
  })

  // Detached + unref: closing craftty must not kill Minecraft.
  // 'exit' still fires while craftty is open.
  child.unref()
  return child
}
