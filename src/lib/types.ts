export interface Employee {
  id: string;
  name: string;
  email: string;
  role: "employee" | "team_lead";
  active: boolean;
  firstLogin: boolean;
  xp: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
}

export interface WorkItem {
  projectName: string;
  task: string;
  description: string;
  plannedQty: number;
  actualQty: number;
  completionPercent: number;
  complexity: "Low" | "Moderate" | "High";
  remarks: string;
}

export interface EodEntry {
  id: string;
  EmployeeName: string;
  Date: string;
  Project: string;
  Task: string;
  Description: string;
  PlannedQty: number;
  ActualQty: number;
  CompletionPct: number;
  Complexity: string;
  Remarks: string;
  Rating: string;
  RatingRemarks: string;
  FilledAt: string;
  XpAwarded: number;
}

export interface Leave {
  id: string;
  EmployeeName: string;
  Date: string;
  Reason: string;
  MarkedBy: string;
}

export interface Badge {
  id: string;
  Name: string;
  Description: string;
  Icon: string;
  Category: string;
}

export interface EarnedBadge {
  id: string;
  EmployeeName: string;
  BadgeName: string;
  DateEarned: string;
  IsNew: boolean;
}

export interface Announcement {
  id: string;
  EmployeeName: string;
  Message: string;
  Type: string;
  Timestamp: string;
  Read: boolean;
}

export interface Notification {
  id: string;
  EmployeeName: string;
  Type: string;
  Title: string;
  Message: string;
  Read: boolean;
  Timestamp: string;
}

export interface PushSubscription {
  id: string;
  EmployeeName: string;
  Endpoint: string;
  P256dh: string;
  Auth: string;
  Active: boolean;
  ReminderCount: number;
}

export interface CalendarEntry {
  id: string;
  Date: string;
  DayType: string;
  Description: string;
  EmployeeName: string;
}

export interface GamificationData {
  xp: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  badges: EarnedBadge[];
  // Level progression metadata (from backend)
  currentXpInLevel: number;
  nextLevelXp: number;
  progressToNextLevel: number;
}

export interface AuthResponse {
  token: string;
  employee: Employee;
  forcePasswordChange: boolean;
}

export interface SubmissionResult {
  entries: EodEntry[];
  xp: { amount: number; earlyBird: boolean; fullCompletion: boolean };
}
