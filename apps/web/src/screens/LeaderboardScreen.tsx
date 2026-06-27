import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/Button';
import { GhostText } from '@/components/GhostText';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { LED_TEXT, scoreColor } from '@/lib/scoreColor';
import { cn } from '@/lib/utils';

type State = 'loading' | 'error' | api.LeaderboardData;

export function LeaderboardScreen({ onHome }: { onHome: () => void }) {
  const { username } = useAuth();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let alive = true;
    void api.fetchLeaderboard(20).then((d) => {
      if (alive) setState(d ?? 'error');
    });
    return () => {
      alive = false;
    };
  }, []);

  const isMe = (name: string) => !!username && name.toLowerCase() === username.toLowerCase();

  return (
    <motion.section
      className="flex min-h-dvh flex-col items-center gap-8 px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GhostText
        value="LEADERBOARD"
        variant="display"
        color="green"
        ariaLabel="Leaderboard"
        className="text-[clamp(1.1rem,5.5vw,2rem)]"
      />

      <div className="w-full max-w-sm">
        {state === 'loading' && (
          <p className="text-center font-mono text-sm tracking-widest text-steel">Loading…</p>
        )}

        {state === 'error' && (
          <p className="text-center font-mono text-sm leading-relaxed text-steel">
            Couldn’t load the leaderboard. It may not be set up yet — play a ranked run and save it
            to be the first.
          </p>
        )}

        {state !== 'loading' && state !== 'error' && (
          <>
            {state.top.length === 0 ? (
              <p className="text-center font-mono text-sm text-steel">
                No scores yet. Be the first to get clocked.
              </p>
            ) : (
              <ol className="flex flex-col divide-y divide-seam/60">
                {state.top.map((entry, i) => (
                  <li
                    key={`${entry.username}-${i}`}
                    className={cn(
                      'flex items-center gap-3 py-2.5 font-mono text-sm',
                      isMe(entry.username) && 'rounded-lg bg-led-green/10 px-2',
                    )}
                  >
                    <span className="w-6 text-right tabular-nums text-steel-dim">{i + 1}</span>
                    <span className={cn('truncate', isMe(entry.username) ? 'text-bone' : 'text-steel')}>
                      {entry.username}
                      {isMe(entry.username) && (
                        <span className="ml-2 text-[0.6rem] uppercase tracking-[0.2em] text-led-green">
                          you
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'ml-auto tabular-nums font-semibold',
                        LED_TEXT[scoreColor(entry.points)],
                      )}
                    >
                      {entry.points.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {state.me && !state.top.some((e) => isMe(e.username)) && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-seam px-3 py-2.5 font-mono text-sm">
                <span className="w-6 text-right tabular-nums text-steel-dim">{state.me.rank}</span>
                <span className="truncate text-bone">
                  {username}
                  <span className="ml-2 text-[0.6rem] uppercase tracking-[0.2em] text-led-green">
                    you
                  </span>
                </span>
                <span className={cn('ml-auto tabular-nums font-semibold', LED_TEXT[scoreColor(state.me.best)])}>
                  {state.me.best.toFixed(1)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <Button variant="ghost" size="md" onClick={onHome} className="mt-auto">
        Home
      </Button>
    </motion.section>
  );
}
