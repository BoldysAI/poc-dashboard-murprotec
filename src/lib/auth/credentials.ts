import { timingSafeEqual } from "node:crypto";

export type AuthConfigStatus =
  | { ok: true; username: string; password: string }
  | { ok: false; reason: "missing_config" };

/**
 * Lit les credentials env. Fail-closed si une variable manque.
 * Comparaison timing-safe côté route login uniquement (Node runtime).
 */
export function getAuthCredentials(): AuthConfigStatus {
  const username = process.env.AUTH_USERNAME?.trim() ?? "";
  const password = process.env.AUTH_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? "";
  if (!username || !password || secret.length < 32) {
    return { ok: false, reason: "missing_config" };
  }
  return { ok: true, username, password };
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Compare against self to keep roughly constant work when lengths differ.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function verifyCredentials(
  username: string,
  password: string,
): { ok: true } | { ok: false; reason: "missing_config" | "invalid" } {
  const config = getAuthCredentials();
  if (!config.ok) return { ok: false, reason: "missing_config" };

  const userOk = safeEqualString(username, config.username);
  const passOk = safeEqualString(password, config.password);
  if (!userOk || !passOk) return { ok: false, reason: "invalid" };
  return { ok: true };
}
