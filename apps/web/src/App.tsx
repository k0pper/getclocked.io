import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { GameState } from '@getclocked/game-core';
import { audio } from '@/audio/engine';
import { AuthProvider } from '@/hooks/useAuth';
import { readPersonalBest } from '@/hooks/usePersonalBest';
import * as api from '@/lib/api';
import { TitleScreen } from '@/screens/TitleScreen';
import { GameScreen } from '@/screens/GameScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';

type Screen = 'title' | 'playing' | 'results' | 'leaderboard';

const randomSeed = () => Math.floor(Math.random() * 0x1_0000_0000);

function Game() {
  const [screen, setScreen] = useState<Screen>('title');
  const [seed, setSeed] = useState(randomSeed);
  const [token, setToken] = useState<string | null>(null);
  const [finalGame, setFinalGame] = useState<GameState | null>(null);
  const [starting, setStarting] = useState(false);

  // Start gesture: kick the AudioContext to life, then ask the server for a
  // seed + single-use token (so the run is *rankable*). If the backend is down
  // or slow, fall back to a local seed and play unranked — never block play.
  const startGame = async () => {
    if (starting) return;
    setStarting(true);
    void audio.start();
    setFinalGame(null);
    const session = await api.startSession();
    setSeed(session ? session.seed : randomSeed());
    setToken(session ? session.token : null);
    setStarting(false);
    setScreen('playing');
  };

  const completeGame = (game: GameState) => {
    setFinalGame(game);
    setScreen('results');
  };

  return (
    <main
      className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <AnimatePresence mode="wait">
        {screen === 'title' && (
          <TitleScreen
            key="title"
            onStart={startGame}
            starting={starting}
            personalBest={readPersonalBest()?.score ?? null}
            onLeaderboard={() => setScreen('leaderboard')}
          />
        )}
        {screen === 'playing' && (
          <GameScreen
            key={`game-${seed}`}
            seed={seed}
            onComplete={completeGame}
            onQuit={() => setScreen('title')}
          />
        )}
        {screen === 'results' && finalGame && (
          <ResultsScreen
            key="results"
            game={finalGame}
            token={token}
            onReplay={startGame}
            onHome={() => setScreen('title')}
            onLeaderboard={() => setScreen('leaderboard')}
          />
        )}
        {screen === 'leaderboard' && (
          <LeaderboardScreen key="leaderboard" onHome={() => setScreen('title')} />
        )}
      </AnimatePresence>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Game />
    </AuthProvider>
  );
}
