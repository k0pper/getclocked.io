import { describe, it, expect } from 'vitest';
import { scoreColor } from './scoreColor';

describe('scoreColor', () => {
  it('maps points to scoreboard colours at the thresholds', () => {
    expect(scoreColor(10)).toBe('green');
    expect(scoreColor(6)).toBe('green');
    expect(scoreColor(5.9)).toBe('amber');
    expect(scoreColor(3.5)).toBe('amber');
    expect(scoreColor(3.49)).toBe('red');
    expect(scoreColor(0)).toBe('red');
  });
});
