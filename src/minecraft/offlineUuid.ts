import crypto from "node:crypto";

/**
 * Vanilla offline UUID: UUID.nameUUIDFromBytes("OfflinePlayer:" + name)
 * That's MD5 → UUID v3. Same name always produces the same id, so
 * playerdata/<uuid>.dat survives logout/login.
 */
export function offlinePlayerUuid(username: string): string {
  const hash = crypto.createHash("md5").update(`OfflinePlayer:${username}`, "utf8").digest();
  hash[6] = (hash[6]! & 0x0f) | 0x30;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
