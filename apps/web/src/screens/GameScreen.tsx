import { motion } from 'motion/react';
import { Button } from '@/components/Button';

interface GameScreenProps {
  onComplete: () => void;
  onQuit: () => void;
}

// Placeholder — the LED clock, buzzer, audio engine, and round machine land in
// the next phases. Kept routable so the title→game→results flow is verifiable.
export function GameScreen({ onComplete, onQuit }: GameScreenProps) {
  return (
    <motion.section
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="max-w-xs font-mono text-sm text-steel">
        gameplay — clock, buzzer &amp; audio wire up next
      </p>
      <div className="flex gap-3">
        <Button variant="ghost" size="sm" onClick={onQuit}>
          Quit
        </Button>
        <Button variant="primary" size="sm" onClick={onComplete}>
          Skip to results
        </Button>
      </div>
    </motion.section>
  );
}
