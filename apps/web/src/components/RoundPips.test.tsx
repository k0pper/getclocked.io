import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoundPips } from './RoundPips';

describe('RoundPips', () => {
  it('labels the current round from the scored count', () => {
    render(<RoundPips total={7} scores={[8, 2]} />);
    // 2 rounds scored → currently on round 3.
    expect(screen.getByRole('img', { name: 'Round 3 of 7' })).toBeInTheDocument();
  });

  it('clamps the label on the final round', () => {
    render(<RoundPips total={7} scores={[5, 5, 5, 5, 5, 5, 5]} />);
    expect(screen.getByRole('img', { name: 'Round 7 of 7' })).toBeInTheDocument();
  });
});
