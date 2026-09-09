import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Employee } from "./types";
import { useAuth } from "./auth";
import { setAuthToken } from "./api";
import {
  setTestModeInterceptor,
  setTestSessionEmployee,
} from "./test-mode-api";
import { TEST_EMPLOYEES, ensureTestSeeded } from "./test-data";

/* ─────────────────────────────────────────────────────────
 * Test Mode provider
 *
 * One switch that turns the whole app into a self-contained
 * demo: every API call is served from the in-memory mock
 * (test-mode-api.ts), the signed-in user can be swapped between
 * any team lead / employee instantly, and nothing touches the
 * real Airtable backend.
 *
 * Entry points:
 *   • "Try demo mode" buttons on the login screen
 *   • URL params: ?test=1 · ?test=employee · ?test=team_lead
 *
 * State survives a page refresh (localStorage).
 * ───────────────────────────────────────────────────────── */

export const TEST_MODE_ACTIVE_KEY = "test_mode_active";
export const TEST_MODE_STORAGE_KEY = "test_mode_selection";

type Role = "employee" | "team_lead";

interface TestModeContextValue {
  active: boolean;
  currentEmployee: Employee | null;
  employees: Employee[];
  /** Sign in as a specific test account (updates the auth context). */
  switchEmployee: (employeeOrId: string | Employee) => Employee | null;
  /** Sign in as the first test account of the given role. */
  switchRole: (role: Role) => Employee | null;
  /** Turn test mode on and sign in as the first account of `role`. */
  enable: (role?: Role) => Employee | null;
  /** Turn test mode off and clear the demo session. */
  disable: () => void;
  /** Bumped on every account switch so consumers can re-sync. */
  version: number;
}

const TestModeContext = createContext<TestModeContextValue | null>(null);

function parseTestModeParam(): { enabled: boolean; role?: Role } {
  if (typeof window === "undefined") return { enabled: false };
  const url = new URLSearchParams(window.location.search);
  const test = url.get("test");
  const testMode = url.get("testMode");
  if (test === "employee" || testMode === "employee") return { enabled: true, role: "employee" };
  if (test === "team_lead" || testMode === "team_lead") return { enabled: true, role: "team_lead" };
  if (test === "1" || testMode === "1") return { enabled: true };
  return { enabled: false };
}

function readStoredSelection(): { id: string; role: Role } | null {
  try {
    const stored = localStorage.getItem(TEST_MODE_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (typeof parsed?.id === "string" && (parsed.role === "employee" || parsed.role === "team_lead")) {
      return { id: parsed.id, role: parsed.role };
    }
  } catch {
    // localStorage unavailable or corrupted — ignore
  }
  return null;
}

function persistSelection(id: string, role: Role) {
  try {
    localStorage.setItem(TEST_MODE_STORAGE_KEY, JSON.stringify({ id, role }));
  } catch {
    // localStorage unavailable — ignore
  }
}

export function isTestModeEnabledFlag(): boolean {
  try {
    return localStorage.getItem(TEST_MODE_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function TestModeProvider({ children }: { children: React.ReactNode }) {
  const { refreshUser, logout } = useAuth();
  const [active, setActive] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [version, setVersion] = useState(0);

  /** Make `emp` the signed-in user of the whole app (auth context + token). */
  const applyEmployee = useCallback(
    (emp: Employee | null) => {
      setCurrentEmployee(emp);
      if (emp) {
        setAuthToken(`test-token-${emp.id}`);
        setTestSessionEmployee(emp.id);
        refreshUser(emp);
        persistSelection(emp.id, emp.role);
      }
    },
    [refreshUser]
  );

  const switchEmployee = useCallback(
    (employeeOrId: string | Employee): Employee | null => {
      const id = typeof employeeOrId === "string" ? employeeOrId : employeeOrId.id;
      const found = TEST_EMPLOYEES.find((emp) => emp.id === id) ?? null;
      if (found) {
        applyEmployee(found);
        setVersion((v) => v + 1);
      }
      return found;
    },
    [applyEmployee]
  );

  const switchRole = useCallback(
    (role: Role): Employee | null => {
      const first = TEST_EMPLOYEES.find((emp) => emp.role === role) ?? null;
      if (first) {
        applyEmployee(first);
        setVersion((v) => v + 1);
      }
      return first;
    },
    [applyEmployee]
  );

  const enable = useCallback(
    (role: Role = "team_lead"): Employee | null => {
      ensureTestSeeded();
      setTestModeInterceptor(true);
      try {
        localStorage.setItem(TEST_MODE_ACTIVE_KEY, "1");
      } catch {
        // ignore
      }
      setActive(true);
      const first = TEST_EMPLOYEES.find((emp) => emp.role === role) ?? null;
      applyEmployee(first);
      setVersion((v) => v + 1);
      return first;
    },
    [applyEmployee]
  );

  const disable = useCallback(() => {
    setTestModeInterceptor(false);
    try {
      localStorage.removeItem(TEST_MODE_ACTIVE_KEY);
      localStorage.removeItem(TEST_MODE_STORAGE_KEY);
    } catch {
      // ignore
    }
    setActive(false);
    setCurrentEmployee(null);
    setVersion((v) => v + 1);
    logout();
  }, [logout]);

  // Activation on mount: URL param wins, then the persisted flag.
  useEffect(() => {
    const { enabled, role } = parseTestModeParam();
    const urlEnabled = enabled;
    const flagEnabled = isTestModeEnabledFlag();
    if (!urlEnabled && !flagEnabled) return;

    if (urlEnabled) {
      try {
        localStorage.setItem(TEST_MODE_ACTIVE_KEY, "1");
      } catch {
        // ignore
      }
    }
    ensureTestSeeded();
    setTestModeInterceptor(true);
    setActive(true);

    // Re-apply the stored selection so the signed-in user always matches
    // the demo account (covers refresh + stale real sessions).
    const stored = readStoredSelection();
    const target =
      (stored && TEST_EMPLOYEES.find((emp) => emp.id === stored.id)) ||
      (role ? TEST_EMPLOYEES.find((emp) => emp.role === role) : undefined) ||
      TEST_EMPLOYEES.find((emp) => emp.role === "team_lead") ||
      null;
    applyEmployee(target);
    setVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue: TestModeContextValue = {
    active,
    currentEmployee,
    employees: TEST_EMPLOYEES,
    switchEmployee,
    switchRole,
    enable,
    disable,
    version,
  };

  return <TestModeContext.Provider value={contextValue}>{children}</TestModeContext.Provider>;
}

export function useTestMode(): TestModeContextValue | null {
  return useContext(TestModeContext);
}

