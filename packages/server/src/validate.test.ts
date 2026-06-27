import { describe, expect, it } from 'vitest';
import { ROUNDS, validateGuesses, validatePassword, validateUsername } from './validate';

describe('validateUsername', () => {
  it('accepts 3–10 letters/digits and lowercases the key', () => {
    const r = validateUsername('K0pper');
    expect(r).toEqual({ ok: true, value: { username: 'K0pper', key: 'k0pper' } });
  });

  it('trims surrounding whitespace', () => {
    const r = validateUsername('  Neo  ');
    expect(r.ok && r.value.username).toBe('Neo');
  });

  it.each(['ab', 'waytoolongname', 'has space', 'em@il', 'snake_case', ''])(
    'rejects %j',
    (bad) => {
      expect(validateUsername(bad).ok).toBe(false);
    },
  );

  it('rejects non-strings', () => {
    expect(validateUsername(123).ok).toBe(false);
    expect(validateUsername(undefined).ok).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a reasonable password', () => {
    expect(validatePassword('hunter2!').ok).toBe(true);
  });
  it('rejects too short', () => {
    expect(validatePassword('123').ok).toBe(false);
  });
});

describe('validateGuesses', () => {
  const valid = Array.from({ length: ROUNDS }, () => 1500);

  it('accepts exactly ROUNDS in-range integers', () => {
    const r = validateGuesses(valid);
    expect(r.ok && r.value.length).toBe(ROUNDS);
  });

  it('rejects the wrong count', () => {
    expect(validateGuesses(valid.slice(1)).ok).toBe(false);
    expect(validateGuesses([...valid, 1500]).ok).toBe(false);
  });

  it('rejects out-of-range / non-finite values', () => {
    expect(validateGuesses([...valid.slice(1), 0]).ok).toBe(false);
    expect(validateGuesses([...valid.slice(1), 99_999]).ok).toBe(false);
    expect(validateGuesses([...valid.slice(1), Number.NaN]).ok).toBe(false);
  });

  it('rounds to whole milliseconds', () => {
    const r = validateGuesses([...valid.slice(1), 1500.7]);
    expect(r.ok && r.value[r.value.length - 1]).toBe(1501);
  });
});
