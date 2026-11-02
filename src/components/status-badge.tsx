import type { Priority, ServiceStatus, ServiceType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { priorityLabel, serviceStatusLabel, serviceTypeLabel } from "@/lib/labels";

const statusClass: Record<ServiceStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-sky-100 text-sky-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-zinc-200 text-zinc-600",
};

const priorityClass: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-800",
  HIGH: "bg-amber-100 text-amber-900",
  URGENT: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge className={statusClass[status]}>{serviceStatusLabel[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={priorityClass[priority]}>{priorityLabel[priority]}</Badge>;
}

export function TypeBadge({ type }: { type: ServiceType }) {
  return <Badge className="bg-teal-50 text-teal-800">{serviceTypeLabel[type]}</Badge>;
}
