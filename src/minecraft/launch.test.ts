import { test, expect } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveResourcePath } from "./launch.js";
import type { Instance } from "../storage.js";

function fakeInstance(folder: string): Instance {
  return {
    id: "test",
    name: "Test",
    version: "1.21.1",
    loader: "vanilla",
    folder,
    createdAt: new Date().toISOString(),
  };
}

test("resolveResourcePath prefers shared when version json exists there", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "craftty-"));
  const shared = path.join(root, "shared");
  const folder = path.join(root, "instance");
  fs.mkdirSync(path.join(shared, "versions", "1.21.1"), { recursive: true });
  fs.writeFileSync(path.join(shared, "versions", "1.21.1", "1.21.1.json"), "{}");
  expect(resolveResourcePath(fakeInstance(folder), shared)).toBe(shared);
});

test("resolveResourcePath falls back to legacy instance folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "craftty-"));
  const shared = path.join(root, "shared");
  const folder = path.join(root, "instance");
  fs.mkdirSync(path.join(folder, "versions", "1.21.1"), { recursive: true });
  fs.writeFileSync(path.join(folder, "versions", "1.21.1", "1.21.1.json"), "{}");
  expect(resolveResourcePath(fakeInstance(folder), shared)).toBe(folder);
});

test("resolveResourcePath defaults to shared when neither has files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "craftty-"));
  const shared = path.join(root, "shared");
  const folder = path.join(root, "instance");
  expect(resolveResourcePath(fakeInstance(folder), shared)).toBe(shared);
});
