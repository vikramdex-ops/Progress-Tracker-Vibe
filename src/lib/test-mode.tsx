import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Employee } from "./types";

export const TEST_MODE_STORAGE_KEY = "test_mode_selection";

interface TestModeContextValue {
  active: boolean;
  currentEmployee: Employee | null;
  employees: Employee[];
  switchEmployee: (employeeOrId: string | Employee) => void;
  switchRole: (role: "employee" | "team_lead") => void;
  enable: () => void;
  disable: () => void;
  resetSession: () => void;
  version: number;
}

const DEFAULT_TEST_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    name: "John Doe",
    email: "john@example.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 150,
    level: 1,
    levelTitle: "Trainee",
    currentStreak: 0,
    longestStreak: 0,
    totalEntries: 2,
  },
  {
    id: "emp-2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "employee",
    active: true,
    firstLogin: false,
    xp: 320,
    level: 2,
    levelTitle: "Specialist",
    currentStreak: 3,
    longestStreak: 5,
    totalEntries: 12,
  },
  {
    id: "tl-1",
    name: "Mike Johnson",
    email: "mike@example.com",
    role: "team_lead",
    active: true,
    firstLogin: false,
    xp: 890,
    level: 5,
    levelTitle: "Team Lead",
    currentStreak: 10,
    longestStreak: 15,
    totalEntries: 45,
  },
];

const TestModeContext = createContext<TestModeContextValue | null>(null);

function parseTestModeParam(): {
  enabled: boolean;
  role?: "employee" | "team_lead";
  employeeId?: string;
} {
  if (typeof window === "undefined") {
    return { enabled: false };
  }

  const url = new URLSearchParams(window.location.search);
  const test = url.get("test");
  const testMode = url.get("testMode");

  if (test === "1" || testMode === "1") {
    return { enabled: true };
  }

  if (test && test.startsWith("employee/")) {
    return { enabled: true, role: "employee", employeeId: test.replace("employee/", "") };
  }

  if (test && test.startsWith("team_lead/")) {
    return { enabled: true, role: "team_lead", employeeId: test.replace("team_lead/", "") };
  }

  if (test === "employee" || test === "team_lead") {
    return { enabled: true, role: test };
  }

  if (test) {
    return { enabled: true };
  }

  return { enabled: false };
}

function getFirstEmployeeByRole(employees: Employee[], role: "employee" | "team_lead"): Employee {
  const filtered = employees.filter((emp) => emp.role === role);
  return filtered.length > 0 ? filtered[0] : DEFAULT_TEST_EMPLOYEES[0];
}

function persistSelection(id: string, role: "employee" | "team_lead") {
  try {
    localStorage.setItem(TEST_MODE_STORAGE_KEY, JSON.stringify({ id, role }));
  } catch {
    // localStorage may not be available or disabled
  }
}

function loadStoredSelection(): { id: string; role: "employee" | "team_lead" } | null {
  try {
    const stored = localStorage.getItem(TEST_MODE_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    if (
      typeof parsed?.id === "string" &&
      (parsed.role === "employee" || parsed.role === "team_lead")
    ) {
      return { id: parsed.id, role: parsed.role };
    }
  } catch {
    // localStorage may not be available or disabled
  }
  return null;
}

export function TestModeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_TEST_EMPLOYEES);
  const [selectedRole, setSelectedRole] = useState<"employee" | "team_lead">("team_lead");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    import("./test-data")
      .then((module) => {
        if (!cancelled && Array.isArray(module.TEST_EMPLOYEES) && module.TEST_EMPLOYEES.length > 0) {
          setEmployees(module.TEST_EMPLOYEES);
        }
      })
      .catch(() => {
        // fallback to DEFAULT_TEST_EMPLOYEES
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const { enabled, role, employeeId } = parseTestModeParam();

    if (enabled) {
      setActive(true);
      if (role) {
        setSelectedRole(role);
        const first = getFirstEmployeeByRole(DEFAULT_TEST_EMPLOYEES, role);
        if (employeeId) {
          const requested = DEFAULT_TEST_EMPLOYEES.find((emp) => emp.id === employeeId);
          setCurrentEmployee(requested ?? first);
        } else {
          setCurrentEmployee(first);
        }
        persistSelection(first.id, first.role);
      } else {
        const first = getFirstEmployeeByRole(DEFAULT_TEST_EMPLOYEES, "team_lead");
        setCurrentEmployee(first);
        persistSelection(first.id, first.role);
      }
    }
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    const stored = loadStoredSelection();
    if (stored) {
      const found = employees.find((emp) => emp.id === stored.id);
      if (found) {
        setCurrentEmployee(found);
        setSelectedRole(found.role);
      } else {
        const first = getFirstEmployeeByRole(employees, stored.role);
        setCurrentEmployee(first);
        setSelectedRole(first.role);
      }
    }
  }, [active, employees]);

  const switchEmployee = useCallback(
    (employeeOrId: string | Employee) => {
      const id = typeof employeeOrId === "string" ? employeeOrId : employeeOrId.id;
      const found = employees.find((emp) => emp.id === id);
      if (found) {
        setCurrentEmployee(found);
        setSelectedRole(found.role);
        persistSelection(found.id, found.role);
        setVersion((v) => v + 1);
      }
    },
    [employees]
  );

  const switchRole = useCallback(
    (role: "employee" | "team_lead") => {
      const first = getFirstEmployeeByRole(employees, role);
      setSelectedRole(role);
      setCurrentEmployee(first);
      persistSelection(first.id, first.role);
      setVersion((v) => v + 1);
    },
    [employees]
  );

  const enable = useCallback(() => {
    setActive(true);
    const first = getFirstEmployeeByRole(employees, selectedRole);
    setCurrentEmployee(first);
    persistSelection(first.id, first.role);
    setVersion((v) => v + 1);
  }, [employees, selectedRole]);

  const disable = useCallback(() => {
    setActive(false);
    setCurrentEmployee(null);
    setSelectedRole("team_lead");
    setVersion((v) => v + 1);
  }, []);

  const resetSession = useCallback(() => {
    setActive(false);
    setCurrentEmployee(null);
    setSelectedRole("team_lead");
    try {
      localStorage.removeItem(TEST_MODE_STORAGE_KEY);
    } catch {
      // localStorage may not be available or disabled
    }
    setVersion((v) => v + 1);
  }, []);

  const contextValue: TestModeContextValue = {
    active,
    currentEmployee,
    employees,
    switchEmployee,
    switchRole,
    enable,
    disable,
    resetSession,
    version,
  };

  return <TestModeContext.Provider value={contextValue}>{children}</TestModeContext.Provider>;
}

export function useTestMode(): TestModeContextValue | null {
  return useContext(TestModeContext);
}

export default { TEST_MODE_STORAGE_KEY, TestModeProvider, useTestMode };
