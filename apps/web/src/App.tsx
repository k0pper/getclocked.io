import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { TitleScreen } from '@/screens/TitleScreen';
import { GameScreen } from '@/screens/GameScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';

type Screen = 'title' | 'playing' | 'results';

export function App() {
  const [screen, setScreen] = useState<Screen>('title');

  return (
    <main
      className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <AnimatePresence mode="wait">
        {screen === 'title' && <TitleScreen key="title" onStart={() => setScreen('playing')} />}
        {screen === 'playing' && (
          <GameScreen
            key="playing"
            onComplete={() => setScreen('results')}
            onQuit={() => setScreen('title')}
          />
        )}
        {screen === 'results' && (
          <ResultsScreen
            key="results"
            onReplay={() => setScreen('playing')}
            onHome={() => setScreen('title')}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
