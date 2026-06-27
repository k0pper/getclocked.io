import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const USERNAME_RE = /^[A-Za-z0-9]{3,10}$/;
const PASSWORD_MIN = 6;

interface AuthFormProps {
  /** Called with the nickname once signed in / signed up. */
  onAuthed?: (username: string) => void;
  className?: string;
}

/** Compact username + password form with a sign-in / sign-up toggle. Validates
 *  client-side (the server re-validates) and surfaces server errors inline. */
export function AuthForm({ onAuthed, className }: AuthFormProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uid = useId();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!USERNAME_RE.test(username)) {
      setError('Nickname: 3–10 letters or numbers, nothing else.');
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`Password: at least ${PASSWORD_MIN} characters.`);
      return;
    }
    setBusy(true);
    const result = mode === 'signin' ? await login(username, password) : await signup(username, password);
    setBusy(false);
    if (result.ok) onAuthed?.(result.data);
    else setError(result.error);
  };

  const inputClass =
    'w-full rounded-xl border border-seam bg-void-deep px-3.5 py-2.5 font-mono text-sm text-bone ' +
    'placeholder:text-steel-dim focus:border-led-green focus:outline-none';

  return (
    <form onSubmit={onSubmit} className={cn('flex w-full max-w-xs flex-col gap-3', className)}>
      <div className="flex gap-1 rounded-xl border border-seam p-1">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              'flex-1 rounded-lg py-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors',
              mode === m ? 'bg-seam text-bone' : 'text-steel hover:text-bone',
            )}
          >
            {m === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <input
        id={`${uid}-username`}
        name="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={10}
        placeholder="nickname"
        aria-label="Nickname"
        className={inputClass}
      />
      <input
        id={`${uid}-password`}
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="password"
        aria-label="Password"
        className={inputClass}
      />

      {error && (
        <p className="font-mono text-xs leading-snug text-led-red" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full">
        {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}
