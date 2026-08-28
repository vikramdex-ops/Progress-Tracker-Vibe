const API_BASE = import.meta.env.VITE_API_URL || "";

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
  if (!API_BASE) throw new Error("API not configured. Set VITE_API_URL environment variable.");
  const token = getAuthToken();
  const url = `${API_BASE}/${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (fetchErr: any) {
    throw new Error(`Network error: Cannot reach API server. Check your connection.`);
  }
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON response (${res.status}). URL: ${url}`);
  }
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
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

// Calendar
export const calendarApi = {
  list: () => apiRequest("calendar"),
  create: (data: any) => apiRequest("calendar", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: string) => apiRequest(`calendar/${id}`, { method: "DELETE" }),
};

// Announcements (Live Feed)
export const announcementsApi = {
  list: () => apiRequest("announcements"),
  create: (data: any) => apiRequest("announcements", { method: "POST", body: JSON.stringify(data) }),
};

// AI Engineering Quiz (NVIDIA MiniMax M3)
export const quizApi = {
  generate: (employee: string) =>
    apiRequest("quiz/generate", { method: "POST", body: JSON.stringify({ employee }) }),
  stats: (employee: string) =>
    apiRequest(`quiz/stats?employee=${encodeURIComponent(employee)}`),
  answer: (data: { employee: string; question: string; answer: string; correctAnswer: string; explanation: string; options?: any; difficulty?: string; category?: string }) =>
    apiRequest("quiz/answer", { method: "POST", body: JSON.stringify(data) }),
  history: (employee: string) =>
    apiRequest(`quiz/history?employee=${encodeURIComponent(employee)}`),
};

// AI Insights (GPT-OSS-20B)
export const aiInsightsApi = {
  eodInsights: (employee: string, entries: any[]) =>
    apiRequest("ai/eod-insights", { method: "POST", body: JSON.stringify({ employee, entries }) }),
  weeklyReport: () => apiRequest("ai/weekly-report"),
};

// Push Notifications
export const pushApi = {
  subscribe: (data: { employeeName: string; endpoint: string; p256dh?: string; auth?: string }) =>
    apiRequest("push/subscribe", { method: "POST", body: JSON.stringify(data) }),
  unsubscribe: (employeeName: string) =>
    apiRequest("push/unsubscribe", { method: "POST", body: JSON.stringify({ employeeName }) }),
  checkReminders: () => apiRequest("push/check-reminders"),
};
