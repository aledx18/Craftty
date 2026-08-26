import { test, expect } from "bun:test";
import { offlinePlayerUuid } from "./offlineUuid.js";

test("offline UUID is stable and UUID-v3 shaped", () => {
  const a = offlinePlayerUuid("Steve");
  const b = offlinePlayerUuid("Steve");
  const c = offlinePlayerUuid("Alex");
  expect(a).toBe(b);
  expect(a).not.toBe(c);
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
