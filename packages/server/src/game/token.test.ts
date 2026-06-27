import { describe, expect, it } from 'vitest';
import { newNonce, signGameToken, verifyGameToken } from './token';

const SECRET = 'test-secret-please-change';

describe('game token', () => {
  const now = 1_000_000;
  const payload = { nonce: newNonce(), seed: 123456789, exp: now + 60_000 };

  it('round-trips a valid token', () => {
    const token = signGameToken(payload, SECRET);
    expect(verifyGameToken(token, SECRET, now)).toEqual(payload);
  });

  it('rejects a tampered body', () => {
    const token = signGameToken(payload, SECRET);
    const [body, sig] = token.split('.');
    const forged = `${body}x.${sig}`;
    expect(verifyGameToken(forged, SECRET, now)).toBeNull();
  });

  it('rejects a wrong secret', () => {
    const token = signGameToken(payload, SECRET);
    expect(verifyGameToken(token, 'other-secret', now)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signGameToken(payload, SECRET);
    expect(verifyGameToken(token, SECRET, payload.exp + 1)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyGameToken('nope', SECRET, now)).toBeNull();
    expect(verifyGameToken('', SECRET, now)).toBeNull();
    expect(verifyGameToken('.', SECRET, now)).toBeNull();
  });

  it('issues unique nonces', () => {
    expect(newNonce()).not.toBe(newNonce());
  });
});
