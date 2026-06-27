import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as api from '@/lib/api';

interface AuthState {
  /** Current nickname, or null when signed out. */
  username: string | null;
  /** True once the initial session check has resolved. */
  ready: boolean;
  login: (username: string, password: string) => Promise<api.ApiResult<string>>;
  signup: (username: string, password: string) => Promise<api.ApiResult<string>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void api.fetchMe().then((u) => {
      if (!alive) return;
      setUsername(u);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    const r = await api.login(u, p);
    if (r.ok) setUsername(r.data);
    return r;
  }, []);

  const signup = useCallback(async (u: string, p: string) => {
    const r = await api.signup(u, p);
    if (r.ok) setUsername(r.data);
    return r;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ username, ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook colocated by convention
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
