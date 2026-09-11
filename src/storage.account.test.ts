import { expect, test } from 'bun:test'
import { offlinePlayerUuid } from '@/src/minecraft/offlineUuid.js'
import { createOfflineAccount, type MicrosoftAccount, normalizeAccount } from '@/src/storage.js'

test('createOfflineAccount sets type and deterministic uuid', () => {
  const acc = createOfflineAccount('  Steve  ')
  expect(acc).toEqual({
    type: 'offline',
    username: 'Steve',
    uuid: offlinePlayerUuid('Steve'),
  })
})

test('normalizeAccount migrates legacy { username, uuid } to offline', () => {
  const legacy = { username: 'Alex', uuid: 'wrong-or-old' }
  const acc = normalizeAccount(legacy)
  expect(acc).toEqual({
    type: 'offline',
    username: 'Alex',
    uuid: offlinePlayerUuid('Alex'),
  })
})

test('normalizeAccount keeps typed offline and fixes uuid from name', () => {
  const acc = normalizeAccount({
    type: 'offline',
    username: 'Alex',
    uuid: '00000000-0000-0000-0000-000000000000',
  })
  expect(acc?.type).toBe('offline')
  expect(acc?.uuid).toBe(offlinePlayerUuid('Alex'))
})

test('normalizeAccount accepts complete microsoft account as-is', () => {
  const ms: MicrosoftAccount = {
    type: 'microsoft',
    username: 'PlayerOne',
    uuid: '11111111-2222-3333-4444-555555555555',
    accessToken: 'at',
    refreshToken: 'rt',
    expiresAt: Date.now() + 60_000,
  }
  expect(normalizeAccount(ms)).toEqual(ms)
})

test('normalizeAccount rejects incomplete microsoft account', () => {
  expect(
    normalizeAccount({
      type: 'microsoft',
      username: 'PlayerOne',
      uuid: '11111111-2222-3333-4444-555555555555',
      accessToken: 'at',
      // missing refreshToken / expiresAt
    }),
  ).toBeNull()
})

test('normalizeAccount rejects empty / garbage', () => {
  expect(normalizeAccount(null)).toBeNull()
  expect(normalizeAccount({})).toBeNull()
  expect(normalizeAccount({ username: '   ' })).toBeNull()
  expect(normalizeAccount({ type: 'nope', username: 'x' })).toBeNull()
})
