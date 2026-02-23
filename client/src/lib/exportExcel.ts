import type {
  Holiday,
  Scale,
  ShiftSwap,
  TeamMember,
  TimeOff,
} from "@/contexts/ScheduleContext";
import { getScheduledPerson, isHoliday, isWorkingDay } from "@/lib/scheduleCalculator";

type ExportExcelOptions = {
  year: number;
  month: number;
  teamMembers: TeamMember[];
  scales: Scale[];
  timeOffs: TimeOff[];
  holidays: Holiday[];
  shiftSwaps: ShiftSwap[];
  isPersonOnTimeOff?: (personName: string, dateStr: string) => boolean;
};

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function dateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateInTimeOff(date: Date, timeOff: TimeOff): boolean {
  const start = new Date(timeOff.startDate);
  if (Number.isNaN(start.getTime())) return false;
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + timeOff.daysCount - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return target >= startDate && target <= endDate;
}

function getTimeOffReason(
  date: Date,
  personName: string,
  timeOffs: TimeOff[]
): string | null {
  const match = timeOffs.find(
    (timeOff) =>
      timeOff.personName === personName && isDateInTimeOff(date, timeOff)
  );
  if (!match) return null;
  return match.type === "vacation" ? "Férias" : "Licença";
}

export async function exportCalendarToExcel({
  year,
  month,
  teamMembers,
  scales,
  timeOffs,
  holidays,
  shiftSwaps,
  isPersonOnTimeOff,
}: ExportExcelOptions) {
  const XLSX = await import("xlsx");
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidayDates = holidays.map((holiday) => holiday.date);

  const rows = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month, day);
    const dateStr = dateToYMD(date);
    const holiday = holidays.find((item) => item.date === dateStr);
    const workingDay = isWorkingDay(date, holidayDates);
    const holidayDay = isHoliday(date, holidayDates);

    const scheduleInfo = getScheduledPerson(
      date,
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidayDates,
      shiftSwaps
    );

    let plantonista = "";
    let substituto = "";
    let motivo = "";

    if (!workingDay) {
      motivo = holidayDay ? `Feriado${holiday?.name ? ` - ${holiday.name}` : ""}` : "Sem expediente";
    } else if (!scheduleInfo) {
      motivo = "Sem escala";
    } else {
      const original = scheduleInfo.originalPerson ?? scheduleInfo.person;
      const assigned = scheduleInfo.person;
      plantonista = original;
      if (assigned && original !== assigned) {
        substituto = assigned;
      }

      if (scheduleInfo.swapReason || shiftSwaps.some((swap) => swap.date === dateStr)) {
        motivo = scheduleInfo.swapReason ? `Troca - ${scheduleInfo.swapReason}` : "Troca";
      } else if (original !== assigned) {
        const timeOffReason = getTimeOffReason(date, original, timeOffs);
        if (timeOffReason) motivo = timeOffReason;
      }
    }

    return {
      Data: formatDateBR(date),
      "Dia da semana": weekdayFormatter.format(date),
      Plantonista: plantonista,
      Substituto: substituto,
      Motivo: motivo,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Escala");

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  XLSX.writeFile(workbook, `escala-plantao-${stamp}.xlsx`);
}
