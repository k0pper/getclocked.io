import { describe, it, expect } from 'vitest';
import { clamp, ms, score, seed } from './units';

describe('clamp', () => {
  it('clamps below / within / above', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('unit constructors', () => {
  it('ms and score are identity at runtime', () => {
    expect(ms(123)).toBe(123);
    expect(score(7.5)).toBe(7.5);
  });

  it('seed coerces into uint32 range', () => {
    expect(seed(-1)).toBe(0xffffffff);
    expect(seed(4_294_967_296)).toBe(0);
    expect(seed(42)).toBe(42);
  });
});
