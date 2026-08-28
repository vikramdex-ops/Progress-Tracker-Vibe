import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Employee } from "./types";
import { authApi, setAuthToken, getAuthToken } from "./api";

interface AuthContextType {
  user: Employee | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ forcePasswordChange: boolean }>;
  logout: () => void;
  refreshUser: (emp: Employee) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ forcePasswordChange: false }),
  logout: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check stored session
    const stored = localStorage.getItem("auth_user");
    if (stored && getAuthToken()) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("auth_user");
        setAuthToken(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res: any = await authApi.login(email, password);
    setAuthToken(res.token);
    setUser(res.employee);
    localStorage.setItem("auth_user", JSON.stringify(res.employee));
    return { forcePasswordChange: res.forcePasswordChange };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem("auth_user");
  }, []);

  const refreshUser = useCallback((emp: Employee) => {
    setUser(emp);
    localStorage.setItem("auth_user", JSON.stringify(emp));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
