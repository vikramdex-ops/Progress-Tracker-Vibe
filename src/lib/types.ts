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

export interface GamificationData {
  xp: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  badges: EarnedBadge[];
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
