import { motion } from 'motion/react';
import { Button } from '@/components/Button';

interface ResultsScreenProps {
  onReplay: () => void;
  onHome: () => void;
}

// Placeholder — final score, rank reveal, per-round breakdown & share land in
// the results/polish phase.
export function ResultsScreen({ onReplay, onHome }: ResultsScreenProps) {
  return (
    <motion.section
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="max-w-xs font-mono text-sm text-steel">
        results — score, rank &amp; breakdown coming soon
      </p>
      <div className="flex gap-3">
        <Button variant="ghost" size="sm" onClick={onHome}>
          Home
        </Button>
        <Button variant="primary" size="sm" onClick={onReplay}>
          Play again
        </Button>
      </div>
    </motion.section>
  );
}
