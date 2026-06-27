import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/**
 * A signed, single-use game token. Issued (anonymously) at game start so the
 * *server* owns the seed; returned at submit. It's an HMAC-signed payload —
 * `body.signature`, both base64url — no JWT dependency needed. The `nonce` is
 * what the DB marks redeemed to prevent replay.
 */
export interface GameTokenPayload {
  nonce: string;
  seed: number;
  /** Expiry, epoch ms. */
  exp: number;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signGameToken(payload: GameTokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Returns the payload if the signature is valid and it hasn't expired, else null. */
export function verifyGameToken(
  token: string,
  secret: string,
  nowMs: number,
): GameTokenPayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as GameTokenPayload).nonce !== 'string' ||
    typeof (payload as GameTokenPayload).seed !== 'number' ||
    typeof (payload as GameTokenPayload).exp !== 'number'
  ) {
    return null;
  }
  const p = payload as GameTokenPayload;
  if (nowMs > p.exp) return null;
  return p;
}

export function newNonce(): string {
  return randomUUID();
}
