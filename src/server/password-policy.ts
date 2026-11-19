import { createHash } from "node:crypto";

const HIBP_RANGE = "https://api.pwnedpasswords.com/range";

/**
 * Returns true if the password appears in known breach corpora (HIBP).
 * Uses k-anonymity: only the SHA-1 prefix is sent to HIBP.
 */
export async function isPasswordLeaked(password: string): Promise<boolean> {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const res = await fetch(`${HIBP_RANGE}/${prefix}`, {
    headers: {
      // HIBP requests a User-Agent identifying the app
      "User-Agent": "Snitch-Password-Check",
      "Add-Padding": "true",
    },
  });

  if (!res.ok) {
    throw new Error(`HIBP range lookup failed (${res.status})`);
  }

  const text = await res.text();
  // Lines look like: SUFFIX:COUNT
  for (const line of text.split("\n")) {
    const [hashSuffix] = line.trim().split(":");
    if (hashSuffix && hashSuffix.toUpperCase() === suffix) {
      return true;
    }
  }
  return false;
}

/** Shared user-facing message — do not reveal count or source details. */
export const LEAKED_PASSWORD_MESSAGE =
  "This password appears in known data breaches. Choose a different password.";
