import { createHash, randomBytes, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CODE_TTL_MS = 15 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 90 * 1000;
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashSecret(value: string): string {
  const salt = process.env["AUTH_RATE_SALT"] ?? "snitch-auth-rate-v1";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

/** 6 uppercase letters A–Z (no digits). */
export function generateLetterCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[randomInt(0, alphabet.length)]!;
  }
  return out;
}

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function sendResetCodeEmail(to: string, code: string): Promise<void> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const from = process.env["RESEND_FROM"] ?? "Snitch <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Snitch password reset code",
      text:
        `Your Snitch verification code is: ${code}\n\n` +
        `It expires in 15 minutes. If you did not request this, ignore this email.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${body.slice(0, 120)}`);
  }
}

export async function findAuthUserIdByEmail(
  db: SupabaseClient,
  email: string,
): Promise<string | null> {
  // Paginate lightly; fine for early traffic. Prefer a profiles.email column later.
  const target = normalizeEmail(email);
  let page = 1;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => normalizeEmail(u.email ?? "") === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}
