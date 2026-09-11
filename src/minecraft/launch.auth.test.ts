import { expect, test } from 'bun:test'
import { launchAuthFromAccount } from '@/src/minecraft/launch.js'
import { createOfflineAccount, type MicrosoftAccount } from '@/src/storage.js'

test('launchAuthFromAccount offline → token 0 + mojang', () => {
  expect(launchAuthFromAccount(createOfflineAccount('Steve'))).toEqual({
    accessToken: '0',
    userType: 'mojang',
  })
})

test('launchAuthFromAccount microsoft → token + msa', () => {
  const ms: MicrosoftAccount = {
    type: 'microsoft',
    username: 'PlayerOne',
    uuid: '11111111-2222-3333-4444-555555555555',
    accessToken: 'real-token',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 60_000,
  }
  expect(launchAuthFromAccount(ms)).toEqual({
    accessToken: 'real-token',
    userType: 'msa',
  })
})
