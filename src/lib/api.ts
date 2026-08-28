const API_BASE = "/api";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  authToken = localStorage.getItem("auth_token");
  return authToken;
}

async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  changePassword: (oldPassword: string, newPassword: string) =>
    apiRequest("auth/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
  forgotPassword: (email: string) =>
    apiRequest("auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// Notifications
export const notificationsApi = {
  list: (employee?: string) => {
    const qs = employee ? `?employee=${encodeURIComponent(employee)}` : "";
    return apiRequest(`notifications${qs}`);
  },
  markRead: (id: string) =>
    apiRequest(`notifications/${id}/read`, { method: "POST" }),
};

// Password Resets (team lead only)
export const passwordResetsApi = {
  list: () => apiRequest("password-resets"),
  approve: (requestId: string, newTempPassword: string) =>
    apiRequest("password-resets/approve", {
      method: "POST",
      body: JSON.stringify({ requestId, newTempPassword }),
    }),
};

// Employees
export const employeesApi = {
  list: () => apiRequest("employees"),
};

// Entries
export const entriesApi = {
  list: (params?: { date?: string; employee?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.employee) qs.set("employee", params.employee);
    const q = qs.toString();
    return apiRequest(`entries${q ? "?" + q : ""}`);
  },
  create: (data: any) =>
    apiRequest("entries", { method: "POST", body: JSON.stringify(data) }),
  rate: (entryId: string, rating: string, ratingRemarks?: string) =>
    apiRequest("entries/rate", {
      method: "POST",
      body: JSON.stringify({ entryId, rating, ratingRemarks }),
    }),
};

// Leaves
export const leavesApi = {
  list: (params?: { date?: string }) => {
    const qs = params?.date ? `?date=${params.date}` : "";
    return apiRequest(`leaves${qs}`);
  },
  create: (data: any) =>
    apiRequest("leaves", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: string) =>
    apiRequest(`leaves/${id}`, { method: "DELETE" }),
};

// Gamification
export const gamificationApi = {
  get: (employee: string) =>
    apiRequest(`gamification?employee=${encodeURIComponent(employee)}`),
};

// Employee actions (team lead)
export const employeeActionsApi = {
  resetPassword: (employeeName: string, newTempPassword: string) =>
    apiRequest("employees/reset-password", {
      method: "POST",
      body: JSON.stringify({ employeeName, newTempPassword }),
    }),
};

// Seed
export const seedApi = {
  run: () => apiRequest("seed", { method: "POST" }),
};
