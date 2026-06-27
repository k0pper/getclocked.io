import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from './app';

const HOST = 'getclocked.io';
const ORIGIN = `https://${HOST}`;

describe('isOriginAllowed', () => {
  it('allows a request with no Origin header (non-browser / same-origin fetch)', () => {
    expect(isOriginAllowed(undefined, HOST, undefined)).toBe(true);
  });

  it('allows a same-origin POST by matching Origin host to Host (no APP_ORIGIN needed)', () => {
    expect(isOriginAllowed(ORIGIN, HOST, undefined)).toBe(true);
  });

  it('allows same-origin regardless of a stale/mismatched APP_ORIGIN', () => {
    // The historical landmine: APP_ORIGIN pinned to the wrong value used to 403
    // every POST. Same-origin must win anyway.
    expect(isOriginAllowed(ORIGIN, HOST, 'https://www.getclocked.io')).toBe(true);
  });

  it('matches Origin host against Host including a port', () => {
    expect(isOriginAllowed('http://localhost:5173', 'localhost:5173', undefined)).toBe(true);
  });

  it('allows an explicitly-allowlisted cross-origin via APP_ORIGIN', () => {
    expect(isOriginAllowed('https://other.example', HOST, 'https://other.example')).toBe(true);
  });

  it('rejects a cross-origin POST that is neither same-host nor allowlisted', () => {
    expect(isOriginAllowed('https://evil.example', HOST, undefined)).toBe(false);
    expect(isOriginAllowed('https://evil.example', HOST, ORIGIN)).toBe(false);
  });

  it('rejects a malformed Origin', () => {
    expect(isOriginAllowed('not-a-url', HOST, undefined)).toBe(false);
  });
});
