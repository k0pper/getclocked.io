import { describe, it, expect } from 'vitest';
import { formatClock, formatSeconds, formatSignedMs } from './format';
import { ms } from './units';

describe('formatClock (MM:SS:CC)', () => {
  it('formats key boundaries', () => {
    expect(formatClock(ms(0))).toBe('00:00:00');
    expect(formatClock(ms(150))).toBe('00:00:15');
    expect(formatClock(ms(999))).toBe('00:00:99');
    expect(formatClock(ms(1000))).toBe('00:01:00');
    expect(formatClock(ms(4213))).toBe('00:04:21');
    expect(formatClock(ms(10_000))).toBe('00:10:00');
    expect(formatClock(ms(60_000))).toBe('01:00:00');
    expect(formatClock(ms(61_230))).toBe('01:01:23');
  });

  it('clamps negatives to zero', () => {
    expect(formatClock(ms(-100))).toBe('00:00:00');
  });
});

describe('formatSeconds', () => {
  it('formats seconds with millisecond precision', () => {
    expect(formatSeconds(ms(0))).toBe('0.000');
    expect(formatSeconds(ms(150))).toBe('0.150');
    expect(formatSeconds(ms(4213))).toBe('4.213');
    expect(formatSeconds(ms(10_000))).toBe('10.000');
  });
});

describe('formatSignedMs', () => {
  it('prefixes a sign and prints zero plainly', () => {
    expect(formatSignedMs(ms(142))).toBe('+142');
    expect(formatSignedMs(ms(-30))).toBe('-30');
    expect(formatSignedMs(ms(0))).toBe('0');
  });
});
