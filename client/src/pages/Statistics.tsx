import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { type HistoricalShift, useSchedule } from "@/contexts/ScheduleContext";
import {
  calculateScheduleStatistics,
  type StatisticsDateKey,
  WEEKDAY_STATISTICS_COLUMNS,
} from "@/lib/statistics";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StatisticsMode = "year" | "month" | "custom";

const MONTH_OPTIONS = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateDisplay = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const formatStoredDateDisplay = (value: string) => {
  const parsed = parseDateInput(value);
  return parsed ? formatDateDisplay(parsed) : value;
};

const formatMonthYear = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(date);

const normalizeHistoricalName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const createHistoricalShiftId = (date: string, person: string) =>
  `historical-${date}-${normalizeHistoricalName(person)}`;

const formatHistoricalShiftText = (items: HistoricalShift[]) =>
  items.map((item) => `${item.date}|${item.person}`).join("\n");

const parseHistoricalShiftText = (value: string) => {
  const errors: string[] = [];
  const byDate = new Map<string, HistoricalShift>();

  value.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const separatorIndex = line.indexOf("|");
    if (separatorIndex === -1) {
      errors.push(`Linha ${index + 1}: use o formato YYYY-MM-DD|Nome.`);
      return;
    }

    const date = line.slice(0, separatorIndex).trim();
    const person = line.slice(separatorIndex + 1).trim();
    const parsedDate = parseDateInput(date);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !parsedDate ||
      formatDateInput(parsedDate) !== date
    ) {
      errors.push(`Linha ${index + 1}: data inválida.`);
      return;
    }

    if (!person) {
      errors.push(`Linha ${index + 1}: informe o nome.`);
      return;
    }

    byDate.set(date, {
      id: createHistoricalShiftId(date, person),
      date,
      person,
    });
  });

  return {
    shifts: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    errors,
  };
};

export default function Statistics() {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const [mode, setMode] = useState<StatisticsMode>("year");
  const [selectedYear, setSelectedYear] = useState(String(todayYear));
  const [selectedMonth, setSelectedMonth] = useState(String(todayMonth));
  const [customStartDate, setCustomStartDate] = useState(
    formatDateInput(new Date(todayYear, todayMonth, 1))
  );
  const [customEndDate, setCustomEndDate] = useState(formatDateInput(today));
  const [showHistoricalDialog, setShowHistoricalDialog] = useState(false);
  const [detailSelection, setDetailSelection] = useState<{
    officer: string;
    label: string;
    dates: string[];
  } | null>(null);

  const {
    teamMembers,
    isPersonOnTimeOff,
    holidays,
    shiftSwaps,
    scales,
    historicalShifts,
    replaceHistoricalShifts,
  } = useSchedule();
  const [historicalShiftText, setHistoricalShiftText] = useState("");

  const holidayDates = useMemo(() => holidays.map((holiday) => holiday.date), [holidays]);

  useEffect(() => {
    setHistoricalShiftText(formatHistoricalShiftText(historicalShifts));
  }, [historicalShifts]);

  const historicalSummary = useMemo(() => {
    const dates = historicalShifts
      .map((shift) => parseDateInput(shift.date))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) {
      return {
        count: 0,
        period: "Nenhum período cadastrado",
      };
    }

    return {
      count: historicalShifts.length,
      period: `${formatMonthYear(dates[0])} até ${formatMonthYear(dates[dates.length - 1])}`,
    };
  }, [historicalShifts]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([
      todayYear - 1,
      todayYear,
      todayYear + 1,
      Number(selectedYear),
    ]);

    holidays.forEach((holiday) => {
      const year = parseDateInput(holiday.date)?.getFullYear();
      if (year) years.add(year);
    });

    scales.forEach((scale) => {
      [scale.createdAt, scale.effectiveFrom, scale.inactiveFrom, scale.anchorDate].forEach(
        (value) => {
          const year = value ? parseDateInput(value)?.getFullYear() : null;
          if (year) years.add(year);
        }
      );
    });

    return Array.from(years).sort((a, b) => a - b);
  }, [holidays, scales, selectedYear, todayYear]);

  const selectedYearNumber = Number(selectedYear);
  const selectedMonthNumber = Number(selectedMonth);
  const statisticsRange = useMemo(() => {
    if (mode === "year") {
      return {
        startDate: new Date(selectedYearNumber, 0, 1),
        endDate: new Date(selectedYearNumber, 11, 31),
      };
    }

    if (mode === "month") {
      return {
        startDate: new Date(selectedYearNumber, selectedMonthNumber, 1),
        endDate: new Date(selectedYearNumber, selectedMonthNumber + 1, 0),
      };
    }

    return {
      startDate: parseDateInput(customStartDate),
      endDate: parseDateInput(customEndDate),
    };
  }, [customEndDate, customStartDate, mode, selectedMonthNumber, selectedYearNumber]);

  const hasValidRange = Boolean(
    statisticsRange.startDate &&
      statisticsRange.endDate &&
      statisticsRange.endDate >= statisticsRange.startDate
  );

  const statistics = useMemo(() => {
    if (!statisticsRange.startDate || !statisticsRange.endDate) {
      return calculateScheduleStatistics({
        startDate: new Date(0),
        endDate: new Date(-1),
        teamMembers,
        scales,
        isPersonOnTimeOff,
        holidays: holidayDates,
        shiftSwaps,
        historicalShifts,
      });
    }

    return calculateScheduleStatistics({
      startDate: statisticsRange.startDate,
      endDate: statisticsRange.endDate,
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidays: holidayDates,
      shiftSwaps,
      historicalShifts,
    });
  }, [
    historicalShifts,
    holidayDates,
    isPersonOnTimeOff,
    scales,
    shiftSwaps,
    statisticsRange.endDate,
    statisticsRange.startDate,
    teamMembers,
  ]);

  const rangeLabel =
    statisticsRange.startDate && statisticsRange.endDate && hasValidRange
      ? `${formatDateDisplay(statisticsRange.startDate)} a ${formatDateDisplay(
          statisticsRange.endDate
        )}`
      : "Selecione um período válido";

  const handleSaveHistoricalShifts = () => {
    const parsed = parseHistoricalShiftText(historicalShiftText);
    if (parsed.errors.length > 0) {
      toast.error(parsed.errors[0]);
      return;
    }

    replaceHistoricalShifts(parsed.shifts);
    setShowHistoricalDialog(false);
    toast.success(`${parsed.shifts.length} plantões históricos salvos`);
  };

  const handleHistoricalDialogOpenChange = (open: boolean) => {
    setShowHistoricalDialog(open);
    if (!open) {
      setHistoricalShiftText(formatHistoricalShiftText(historicalShifts));
    }
  };

  const handleOpenHistoricalImport = () => {
    setHistoricalShiftText(formatHistoricalShiftText(historicalShifts));
    setShowHistoricalDialog(true);
  };

  const handleCancelHistoricalImport = () => {
    setHistoricalShiftText(formatHistoricalShiftText(historicalShifts));
    setShowHistoricalDialog(false);
  };

  const getDetailLabel = (key: StatisticsDateKey) => {
    if (key === "total") return "Total";
    return WEEKDAY_STATISTICS_COLUMNS.find((column) => column.key === key)?.label ?? "";
  };

  const openDateDetails = (officer: string, key: StatisticsDateKey, dates: string[]) => {
    setDetailSelection({
      officer,
      label: getDetailLabel(key),
      dates: [...dates].sort(),
    });
  };

  const renderStatisticValue = (
    value: number,
    officer: string,
    key: StatisticsDateKey,
    dates: string[],
    strong = false
  ) => {
    if (value === 0) {
      return <span className={strong ? "font-semibold" : undefined}>0</span>;
    }

    return (
      <button
        type="button"
        onClick={() => openDateDetails(officer, key, dates)}
        className={`rounded-md px-2 py-1 text-right underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          strong ? "font-bold text-primary" : "font-semibold text-primary"
        }`}
        title={`Ver datas de ${officer}`}
      >
        {value}
      </button>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Estatísticas</h1>
          <p className="text-muted-foreground">
            Contagem de plantões por oficial e por dia da semana.
          </p>
        </div>

        <Card className="mb-8 border border-border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statistics-mode">Modo</Label>
                <Select value={mode} onValueChange={(value) => setMode(value as StatisticsMode)}>
                  <SelectTrigger id="statistics-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Ano</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="custom">Período personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode !== "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="statistics-year">Ano</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="statistics-year" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "month" && (
                <div className="space-y-2">
                  <Label htmlFor="statistics-month">Mês</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="statistics-month" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="statistics-start-date">Data inicial</Label>
                    <Input
                      id="statistics-start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(event) => setCustomStartDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="statistics-end-date">Data final</Label>
                    <Input
                      id="statistics-end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(event) => setCustomEndDate(event.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Período: <span className="font-medium text-foreground">{rangeLabel}</span>
            </div>
            {!hasValidRange && (
              <p className="mt-2 text-sm text-destructive">
                A data final deve ser igual ou posterior à data inicial.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8 border border-border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Plantões históricos manuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Plantões históricos cadastrados:{" "}
                  <span className="font-semibold text-foreground">{historicalSummary.count}</span>
                </p>
                <p className="text-muted-foreground">
                  Período coberto:{" "}
                  <span className="font-semibold text-foreground">{historicalSummary.period}</span>
                </p>
              </div>

              <Button onClick={handleOpenHistoricalImport}>
                {historicalSummary.count > 0
                  ? "Gerenciar históricos"
                  : "Importar históricos antigos"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showHistoricalDialog} onOpenChange={handleHistoricalDialogOpenChange}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Gerenciar históricos</DialogTitle>
              <DialogDescription>
                Cole um plantão por linha. Use o formato YYYY-MM-DD|Nome.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Label htmlFor="historical-shifts">Plantões históricos</Label>
              <Textarea
                id="historical-shifts"
                value={historicalShiftText}
                onChange={(event) => setHistoricalShiftText(event.target.value)}
                className="min-h-72 font-mono text-sm"
                placeholder="YYYY-MM-DD|Nome"
              />
              <p className="text-sm text-muted-foreground">
                Em datas iguais, o plantão histórico manual substitui a escala gerada na
                estatística.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setHistoricalShiftText("")}>
                Limpar
              </Button>
              <Button variant="outline" onClick={handleCancelHistoricalImport}>
                Cancelar
              </Button>
              <Button onClick={handleSaveHistoricalShifts}>Salvar históricos</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(detailSelection)} onOpenChange={(open) => !open && setDetailSelection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {detailSelection
                  ? `${detailSelection.officer} - ${detailSelection.label}`
                  : "Datas dos plantões"}
              </DialogTitle>
              <DialogDescription>
                Datas consideradas no período selecionado.
              </DialogDescription>
            </DialogHeader>

            {detailSelection && (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {detailSelection.dates.length > 0 ? (
                  <div className="divide-y divide-border">
                    {detailSelection.dates.map((date) => (
                      <div key={date} className="px-4 py-3 text-sm font-medium">
                        {formatStoredDateDisplay(date)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    Nenhuma data encontrada.
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-6 py-4 font-semibold">Oficial</TableHead>
                {WEEKDAY_STATISTICS_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="px-6 py-4 text-right font-semibold">
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="px-6 py-4 text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistics.rows.map((row) => (
                <TableRow key={row.memberId}>
                  <TableCell className="px-6 py-4 font-medium">{row.officer}</TableCell>
                  {WEEKDAY_STATISTICS_COLUMNS.map((column) => (
                    <TableCell key={column.key} className="px-6 py-4 text-right">
                      {renderStatisticValue(
                        row.weekdays[column.key],
                        row.officer,
                        column.key,
                        row.dates[column.key]
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="px-6 py-4 text-right font-semibold">
                    {renderStatisticValue(row.total, row.officer, "total", row.dates.total, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="px-6 py-4 font-bold">Total</TableCell>
                {WEEKDAY_STATISTICS_COLUMNS.map((column) => (
                  <TableCell key={column.key} className="px-6 py-4 text-right font-bold">
                    {renderStatisticValue(
                      statistics.totals.weekdays[column.key],
                      "Total geral",
                      column.key,
                      statistics.totals.dates[column.key],
                      true
                    )}
                  </TableCell>
                ))}
                <TableCell className="px-6 py-4 text-right font-bold">
                  {renderStatisticValue(
                    statistics.totals.total,
                    "Total geral",
                    "total",
                    statistics.totals.dates.total,
                    true
                  )}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
