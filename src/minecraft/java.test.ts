import { expect, test } from 'bun:test'
import { parseJavaMajor, pickJava } from '@/src/minecraft/java.js'

test('parseJavaMajor reads modern OpenJDK', () => {
  expect(parseJavaMajor('openjdk version "21.0.5" 2024-10-15')).toBe(21)
  expect(parseJavaMajor('openjdk version "27" 2026-09-15')).toBe(27)
})

test('parseJavaMajor reads legacy 1.8', () => {
  expect(parseJavaMajor('java version "1.8.0_432"')).toBe(8)
})

test('pickJava prefers exact major then closest higher', () => {
  const runtimes = [
    { path: '/a/java17', major: 17 },
    { path: '/b/java27', major: 27 },
  ]
  expect(pickJava(runtimes, 21).path).toBe('/b/java27')
  expect(pickJava(runtimes, 17).path).toBe('/a/java17')
})

test('pickJava throws when only older runtimes exist', () => {
  expect(() => pickJava([{ path: '/a/java17', major: 17 }], 21)).toThrow(/Need Java 21/)
})
