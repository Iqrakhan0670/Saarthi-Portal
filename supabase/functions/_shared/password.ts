import { hash, compare } from "npm:bcrypt-ts@5";

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

export function isBcryptHash(stored: string): boolean {
  return typeof stored === "string" && /^\$2[aby]\$/.test(stored);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!isBcryptHash(storedHash)) {
    // Old SHA-256 hash — reject cleanly so the user gets a normal
    // "invalid credentials" response and is routed to reset their password.
    return false;
  }
  return await compare(password, storedHash);
}
