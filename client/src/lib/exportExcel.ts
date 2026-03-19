import type {
  Holiday,
  Scale,
  ShiftSwap,
  TeamMember,
  TimeOff,
} from "@/contexts/ScheduleContext";
import { getMonthSchedule, isHoliday, isWorkingDay } from "@/lib/scheduleCalculator";

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
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

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
  const monthSchedule = getMonthSchedule(
    year,
    month,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidayDates,
    shiftSwaps
  );
  const scheduleByDate = new Map(
    monthSchedule.map((item) => [dateToYMD(item.date), item])
  );

  const rows = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month, day);
    const dateStr = dateToYMD(date);
    const holiday = holidays.find((item) => item.date === dateStr);
    const workingDay = isWorkingDay(date, holidayDates);
    const holidayDay = isHoliday(date, holidayDates);

    const scheduleInfo = scheduleByDate.get(dateStr);

    let plantonista = "";
    let substituto = "";
    let motivo = "";
    let escalaDefinitiva = "";

    if (!workingDay) {
      motivo = holidayDay ? `Feriado${holiday?.name ? ` - ${holiday.name}` : ""}` : "Sem expediente";
    } else if (!scheduleInfo) {
      motivo = "Sem escala";
    } else {
      const original = scheduleInfo.originalPerson ?? scheduleInfo.person;
      const assigned = scheduleInfo.person;
      plantonista = original;
      escalaDefinitiva = assigned ?? "";
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
      "ESCALA DEFINITIVA": escalaDefinitiva,
      _meta: {
        workingDay,
        weekend: date.getDay() === 0 || date.getDay() === 6,
      },
    };
  });

  const headers = [
    "Data",
    "Dia da semana",
    "Plantonista",
    "Substituto",
    "Motivo",
    "ESCALA DEFINITIVA",
  ];

  const title = `Municipio de Hortolandia - Escala de Plantao (${monthFormatter.format(
    new Date(year, month, 1)
  )})`;

  const dataRows = rows.map((row) => [
    row.Data,
    row["Dia da semana"],
    row.Plantonista,
    row.Substituto,
    row.Motivo,
    row["ESCALA DEFINITIVA"],
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([[title], headers, ...dataRows]);

  const lastCol = String.fromCharCode(64 + headers.length);
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
  ];
  worksheet["!autofilter"] = { ref: `A2:${lastCol}2` };
  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 2,
    topLeftCell: "A3",
    activePane: "bottomLeft",
    state: "frozen",
  };

  const baseBorder = {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  };

  const titleStyle = {
    font: { bold: true, sz: 14, color: { rgb: "111827" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  const headerStyle = {
    font: { bold: true, color: { rgb: "111827" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { patternType: "solid", fgColor: { rgb: "E5E7EB" } },
    border: baseBorder,
  };

  const zebraFill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
  const nonWorkingFill = { patternType: "solid", fgColor: { rgb: "FFF4E5" } };

  const setCell = (
    cellRef: string,
    value: string,
    style: Record<string, unknown>
  ) => {
    worksheet[cellRef] = { t: "s", v: value, s: style };
  };

  // Title row
  setCell("A1", title, titleStyle);

  // Header row (row 2)
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: index });
    worksheet[cellRef].s = headerStyle;
  });

  // Data rows start at row 3 (r = 2)
  rows.forEach((row, rowIndex) => {
    const dataRowIndex = rowIndex + 2;
    const isStriped = rowIndex % 2 === 1;
    const fill =
      row._meta.workingDay === false ? nonWorkingFill : isStriped ? zebraFill : undefined;

    headers.forEach((header, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: dataRowIndex, c: colIndex });
      const cell = worksheet[cellRef];
      if (!cell) {
        worksheet[cellRef] = { t: "s", v: "" };
      }

      const isMotivo = header === "Motivo";
      const isDate = header === "Data" || header === "Dia da semana";

      worksheet[cellRef].s = {
        border: baseBorder,
        fill,
        alignment: {
          horizontal: isDate ? "center" : "left",
          vertical: "top",
          wrapText: isMotivo,
        },
      };
    });
  });

  const columnWidths = headers.map((header, colIndex) => {
    const contentLengths = dataRows.map((row) => String(row[colIndex] ?? "").length);
    const maxContent = Math.max(header.length, ...contentLengths);
    const minWidth =
      header === "Motivo" ? 32 : header === "ESCALA DEFINITIVA" ? 24 : 14;
    const width = Math.min(Math.max(maxContent + 2, minWidth), 40);
    return { wch: width };
  });

  worksheet["!cols"] = columnWidths;

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
