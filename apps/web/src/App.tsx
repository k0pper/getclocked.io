import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { GameState } from '@getclocked/game-core';
import { audio } from '@/audio/engine';
import { readPersonalBest } from '@/hooks/usePersonalBest';
import { TitleScreen } from '@/screens/TitleScreen';
import { GameScreen } from '@/screens/GameScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';

type Screen = 'title' | 'playing' | 'results';

const randomSeed = () => Math.floor(Math.random() * 0x1_0000_0000);

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [seed, setSeed] = useState(randomSeed);
  const [finalGame, setFinalGame] = useState<GameState | null>(null);

  // Called from the Start gesture — kicks the AudioContext to life here so the
  // first beep isn't blocked by autoplay policy.
  const startGame = () => {
    void audio.start();
    setSeed(randomSeed());
    setFinalGame(null);
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
          <TitleScreen key="title" onStart={startGame} personalBest={readPersonalBest()?.score ?? null} />
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
            onReplay={startGame}
            onHome={() => setScreen('title')}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
