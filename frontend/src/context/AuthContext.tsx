import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, type AuthUser, type SignupInput } from "../api/auth.api";
import { TOKEN_KEY, UNAUTHORIZED_EVENT } from "../api/axios/axios.client";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: SignupInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    () => localStorage.getItem(TOKEN_KEY) !== null,
  );

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // restore the session after a page reload
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    let cancelled = false;
    authApi
      .profile()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && clear())
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clear]);

  // any 401 from the API (expired token) ends the session
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clear);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clear);
  }, [clear]);

  const startSession = useCallback(
    (result: { token: string; user: AuthUser }) => {
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(result.user);
      setIsLoading(false);
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) =>
      startSession(await authApi.login(email, password)),
    [startSession],
  );
  const signup = useCallback(
    async (input: SignupInput) => startSession(await authApi.signup(input)),
    [startSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, logout: clear, signup }),
    [user, token, isLoading, login, clear, signup],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
