import type {
  HistoricalShift,
  Scale,
  ShiftSwap,
  TeamMember,
} from "@/contexts/ScheduleContext";
import { getMonthSchedule } from "@/lib/scheduleCalculator";

export type WeekdayStatisticKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export const WEEKDAY_STATISTICS_COLUMNS: Array<{
  key: WeekdayStatisticKey;
  day: number;
  label: string;
}> = [
  { key: "monday", day: 1, label: "Seg" },
  { key: "tuesday", day: 2, label: "Ter" },
  { key: "wednesday", day: 3, label: "Qua" },
  { key: "thursday", day: 4, label: "Qui" },
  { key: "friday", day: 5, label: "Sex" },
];

export type WeekdayStatisticsCounts = Record<WeekdayStatisticKey, number>;
export type StatisticsDateKey = WeekdayStatisticKey | "total";
export type StatisticsDates = Record<StatisticsDateKey, string[]>;

export interface OfficerStatisticsRow {
  memberId: string;
  officer: string;
  weekdays: WeekdayStatisticsCounts;
  total: number;
  dates: StatisticsDates;
}

export interface ScheduleStatisticsResult {
  rows: OfficerStatisticsRow[];
  totals: {
    weekdays: WeekdayStatisticsCounts;
    total: number;
    dates: StatisticsDates;
  };
}

interface CalculateScheduleStatisticsParams {
  startDate: Date;
  endDate: Date;
  teamMembers: TeamMember[];
  scales: Scale[];
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean;
  holidays?: string[];
  shiftSwaps?: ShiftSwap[];
  historicalShifts?: HistoricalShift[];
}

const createEmptyCounts = (): WeekdayStatisticsCounts => ({
  monday: 0,
  tuesday: 0,
  wednesday: 0,
  thursday: 0,
  friday: 0,
});

const createEmptyDates = (): StatisticsDates => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  total: [],
});

const normalizeDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dateToString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateFromString = (value: string): Date | null => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const getWeekdayKey = (day: number): WeekdayStatisticKey | null =>
  WEEKDAY_STATISTICS_COLUMNS.find((column) => column.day === day)?.key ?? null;

const getMonthCursor = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const isMemberActiveOnDate = (member: TeamMember, date: Date) => {
  const joinDate = dateFromString(member.joinDate);
  if (joinDate && date < joinDate) return false;

  if (member.removeDate) {
    const removeDate = dateFromString(member.removeDate);
    if (removeDate && date >= removeDate) return false;
  }

  return true;
};

export function calculateScheduleStatistics({
  startDate,
  endDate,
  teamMembers,
  scales,
  isPersonOnTimeOff,
  holidays,
  shiftSwaps,
  historicalShifts,
}: CalculateScheduleStatisticsParams): ScheduleStatisticsResult {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);
  const rows = teamMembers.map<OfficerStatisticsRow>((member) => ({
    memberId: member.id,
    officer: member.name,
    weekdays: createEmptyCounts(),
    total: 0,
    dates: createEmptyDates(),
  }));
  const totals = {
    weekdays: createEmptyCounts(),
    total: 0,
    dates: createEmptyDates(),
  };

  if (normalizedEnd < normalizedStart) {
    return { rows, totals };
  }

  const rowByName = new Map(rows.map((row) => [normalizeName(row.officer), row]));
  const memberByName = new Map(teamMembers.map((member) => [normalizeName(member.name), member]));
  const historicalByDate = new Map<string, HistoricalShift>();
  const addShiftToTotals = (date: Date, person: string) => {
    const weekdayKey = getWeekdayKey(date.getDay());
    if (!weekdayKey) return;

    const rowKey = normalizeName(person);
    const teamMember = memberByName.get(rowKey);
    if (teamMember && !isMemberActiveOnDate(teamMember, date)) return;

    let row = rowByName.get(rowKey);
    if (!row) {
      row = {
        memberId: rowKey,
        officer: person,
        weekdays: createEmptyCounts(),
        total: 0,
        dates: createEmptyDates(),
      };
      rows.push(row);
      rowByName.set(rowKey, row);
    }

    const dateStr = dateToString(date);
    row.weekdays[weekdayKey] += 1;
    row.total += 1;
    row.dates[weekdayKey].push(dateStr);
    row.dates.total.push(dateStr);
    totals.weekdays[weekdayKey] += 1;
    totals.total += 1;
    totals.dates[weekdayKey].push(dateStr);
    totals.dates.total.push(dateStr);
  };

  historicalShifts?.forEach((shift) => {
    const parsedDate = dateFromString(shift.date);
    if (!parsedDate || !shift.person.trim()) return;
    historicalByDate.set(dateToString(parsedDate), shift);
  });

  const startMonth = getMonthCursor(normalizedStart);
  const endMonth = getMonthCursor(normalizedEnd);

  for (
    let cursor = new Date(startMonth);
    cursor <= endMonth;
    cursor.setMonth(cursor.getMonth() + 1)
  ) {
    const monthSchedule = getMonthSchedule(
      cursor.getFullYear(),
      cursor.getMonth(),
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidays,
      shiftSwaps
    );

    monthSchedule.forEach((assignment) => {
      const assignmentDate = normalizeDate(assignment.date);
      if (assignmentDate < normalizedStart || assignmentDate > normalizedEnd) return;
      if (historicalByDate.has(dateToString(assignmentDate))) return;

      addShiftToTotals(assignmentDate, assignment.person);
    });
  }

  historicalByDate.forEach((shift) => {
    const shiftDate = dateFromString(shift.date);
    if (!shiftDate) return;
    const normalizedShiftDate = normalizeDate(shiftDate);
    if (normalizedShiftDate < normalizedStart || normalizedShiftDate > normalizedEnd) return;

    addShiftToTotals(normalizedShiftDate, shift.person);
  });

  rows.forEach((row) => {
    Object.values(row.dates).forEach((dates) => dates.sort());
  });
  Object.values(totals.dates).forEach((dates) => dates.sort());

  return { rows, totals };
}
