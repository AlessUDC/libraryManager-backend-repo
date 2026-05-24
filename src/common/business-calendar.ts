/** Hora de cierre para préstamos en sala (19:00 local del servidor). */
export const LIBRARY_CLOSING_HOUR = 19;

/**
 * Feriados configurables (YYYY-MM-DD). Ampliar vía variable de entorno HOLIDAY_DATES (coma-separados).
 */
const DEFAULT_HOLIDAYS: string[] = [];

function loadHolidaySet(): Set<string> {
  const fromEnv = process.env.HOLIDAY_DATES?.split(',').map((d) => d.trim()) ?? [];
  return new Set([...DEFAULT_HOLIDAYS, ...fromEnv].filter(Boolean));
}

let holidayCache: Set<string> | null = null;

export function getHolidayDates(): Set<string> {
  if (!holidayCache) holidayCache = loadHolidaySet();
  return holidayCache;
}

export function resetHolidayCacheForTests(): void {
  holidayCache = null;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date): boolean {
  return getHolidayDates().has(toDateKey(date));
}

/** Día hábil: lunes–viernes y no feriado. */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

export function isAfterLibraryClosing(date: Date = new Date()): boolean {
  return date.getHours() >= LIBRARY_CLOSING_HOUR;
}

export function canReserveLibraryLoan(date: Date = new Date()): boolean {
  return !isAfterLibraryClosing(date);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addLocalDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Días de penalización (multas / hitos 1-3-9) contando solo días hábiles tras el vencimiento.
 */
export function countCalendarBusinessOverdueDays(
  dueDate: Date,
  now: Date,
): number {
  if (now <= dueDate) return 0;

  let count = 0;
  let cursor = addLocalDays(startOfLocalDay(dueDate), 1);

  while (cursor <= now) {
    if (isBusinessDay(cursor)) count++;
    cursor = addLocalDays(cursor, 1);
  }

  return count;
}

export function useLoanPenaltySimulation(): boolean {
  return (
    process.env.LOAN_PENALTY_SIMULATION_MINUTES === 'true' ||
    process.env.NODE_ENV === 'test'
  );
}

/**
 * Días de penalización por retraso (multas / hitos 1-3-9).
 * En simulación (tests): 1 minuto de retraso = 1 día de penalización, solo en días hábiles.
 */
export function countOverduePenaltyDays(dueDate: Date, now: Date): number {
  if (now <= dueDate) return 0;

  if (useLoanPenaltySimulation()) {
    if (!isBusinessDay(now)) return 0;
    const diffMinutes = Math.ceil(
      (now.getTime() - dueDate.getTime()) / (1000 * 60),
    );
    return diffMinutes;
  }

  return countCalendarBusinessOverdueDays(dueDate, now);
}

/** En fin de semana/feriado no se avanzan multas ni hitos por día, pero sí otras acciones del cron. */
export function shouldApplyDailyPenaltyLogic(now: Date = new Date()): boolean {
  return isBusinessDay(now);
}
