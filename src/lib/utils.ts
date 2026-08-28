import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0; // Sunday is holiday by default
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 4); // Friday
  end.setHours(23, 59, 59, 999);
  return end;
}

export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number; title: string } {
  const levels = [
    { level: 1, xp: 0, title: "Piping Trainee" },
    { level: 2, xp: 50, title: "Piping Explorer" },
    { level: 3, xp: 150, title: "Piping Practitioner" },
    { level: 4, xp: 350, title: "Piping Specialist" },
    { level: 5, xp: 600, title: "Piping Expert" },
    { level: 6, xp: 1000, title: "Piping Champion" },
    { level: 7, xp: 1500, title: "Piping Master" },
    { level: 8, xp: 2200, title: "Piping Legend" },
    { level: 9, xp: 3000, title: "Piping Guru" },
    { level: 10, xp: 5000, title: "Piping Wizard" },
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) {
      currentLevel = levels[i];
      nextLevel = levels[Math.min(i + 1, levels.length - 1)];
      break;
    }
  }

  const currentXp = xp - currentLevel.xp;
  const nextLevelXp = nextLevel.xp - currentLevel.xp;
  const progress = nextLevelXp > 0 ? (currentXp / nextLevelXp) * 100 : 100;

  return {
    level: currentLevel.level,
    currentXp,
    nextLevelXp,
    progress: Math.min(progress, 100),
    title: currentLevel.title,
  };
}

export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sortedDates = dates
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a);

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestDate = new Date(sortedDates[0]);
  latestDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.floor(
      (new Date(sortedDates[i - 1]).getTime() - new Date(sortedDates[i]).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
