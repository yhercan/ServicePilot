import type { ServiceStatus } from "@prisma/client";

export const calendarStatusBar: Record<ServiceStatus, string> = {
  PLANNED: "bg-slate-400",
  ASSIGNED: "bg-teal-600",
  IN_PROGRESS: "bg-amber-500",
  WAITING: "bg-orange-500",
  COMPLETED: "bg-emerald-600",
  CANCELLED: "bg-zinc-400",
};

export const calendarStatusSoft: Record<ServiceStatus, string> = {
  PLANNED: "bg-slate-100/80 text-slate-700",
  ASSIGNED: "bg-teal-50 text-teal-900",
  IN_PROGRESS: "bg-amber-50 text-amber-950",
  WAITING: "bg-orange-50 text-orange-950",
  COMPLETED: "bg-emerald-50 text-emerald-900",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

export const calendarStatusDot: Record<ServiceStatus, string> = {
  PLANNED: "bg-slate-400",
  ASSIGNED: "bg-teal-600",
  IN_PROGRESS: "bg-amber-500",
  WAITING: "bg-orange-500",
  COMPLETED: "bg-emerald-600",
  CANCELLED: "bg-zinc-400",
};
