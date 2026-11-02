const ISTANBUL = "Europe/Istanbul";
const OFFSET = "+03:00";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function istanbulDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateKey(value: string | undefined) {
  const fallback = istanbulDateKey(new Date());
  const key = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  const [year, month, day] = key.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return parseDateKey(fallback);
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return parseDateKey(undefined);
  }
  return { year, month, day, key };
}

export function parseDateInput(value: string) {
  return new Date(`${value}T09:00:00${OFFSET}`);
}

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function parseDateTimeInput(value: string) {
  if (!value) return null;
  const date = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return dateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function toDateTimeInputValue(date: Date | null | undefined) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: ISTANBUL,
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ISTANBUL,
  }).format(date);
}

export function formatMonthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: ISTANBUL,
  }).format(new Date(`${dateKey(year, month, 1)}T12:00:00${OFFSET}`));
}

export function formatDayTitle(year: number, month: number, day: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
    timeZone: ISTANBUL,
  }).format(new Date(`${dateKey(year, month, day)}T12:00:00${OFFSET}`));
}

export function mondayIndex(year: number, month: number, day: number) {
  const name = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: ISTANBUL,
  }).format(new Date(`${dateKey(year, month, day)}T12:00:00${OFFSET}`));
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const index = order.indexOf(name);
  if (index < 0) {
    throw new Error("Takvim günü hesaplanamadı.");
  }
  return index;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function addDays(year: number, month: number, day: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  const next = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
  return { ...next, key: dateKey(next.year, next.month, next.day) };
}

export type CalendarCell = {
  key: string;
  day: number;
  inMonth: boolean;
};

export function buildMonthCells(year: number, month: number): CalendarCell[] {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = mondayIndex(year, month, 1);
  const cells: CalendarCell[] = [];
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const previousCount = new Date(Date.UTC(previous.year, previous.month, 0)).getUTCDate();

  for (let index = 0; index < lead; index += 1) {
    const day = previousCount - lead + 1 + index;
    cells.push({
      key: dateKey(previous.year, previous.month, day),
      day,
      inMonth: false,
    });
  }

  for (let day = 1; day <= count; day += 1) {
    cells.push({ key: dateKey(year, month, day), day, inMonth: true });
  }

  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      key: dateKey(next.year, next.month, trailing),
      day: trailing,
      inMonth: false,
    });
    trailing += 1;
  }

  return cells;
}

export function buildWeekKeys(year: number, month: number, day: number) {
  const start = addDays(year, month, day, -mondayIndex(year, month, day));
  return Array.from({ length: 7 }, (_, index) => addDays(start.year, start.month, start.day, index));
}

export function istanbulDayRange(key: string) {
  return {
    start: new Date(`${key}T00:00:00${OFFSET}`),
    end: new Date(`${key}T23:59:59.999${OFFSET}`),
  };
}
