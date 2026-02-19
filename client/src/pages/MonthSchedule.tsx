import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import { getMonthSchedule } from "@/lib/scheduleCalculator";
import { useSchedule } from "@/contexts/ScheduleContext";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";

export default function MonthSchedule() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedPerson, setSelectedPerson] = useState<string>("all");

  const { teamMembers, isPersonOnTimeOff, holidays, shiftSwaps, scales } = useSchedule();
  const holidayDates = holidays.map((h) => h.date);
  const allSchedule = getMonthSchedule(
    currentYear,
    currentMonth,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidayDates,
    shiftSwaps
  );
  const schedule =
    selectedPerson !== "all"
      ? allSchedule.filter((day) => day.person === selectedPerson)
      : allSchedule;

  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(currentYear, currentMonth));

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  };

  // Agrupar por semana
  const weeks: (typeof schedule)[] = [];
  let currentWeek: typeof schedule = [];

  schedule.forEach((day) => {
    const dayOfWeek = day.date.getDay();
    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Escala do Mês
          </h1>
          <p className="text-muted-foreground">
            Visualize a escala completa do mês
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="gap-2"
          >
            <ChevronLeft size={16} />
            Anterior
          </Button>

          <h2 className="text-2xl font-semibold text-foreground capitalize">
            {monthName}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="gap-2"
          >
            Próximo
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Filter by Person */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por pessoa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pessoas</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.name}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPerson !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPerson("all")}
              className="gap-2"
            >
              <X size={16} />
              Limpar filtro
            </Button>
          )}
        </div>

        {/* Schedule Grid */}
        <div className="space-y-6">
          {weeks.length > 0 ? (
            weeks.map((week, weekIndex) => (
              <Card
                key={weekIndex}
                className="p-6 border border-border shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="p-4 bg-secondary/30 rounded-lg border border-border/50"
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        {formatDate(day.date)}
                      </p>

                      {day.originalPerson && day.originalPerson !== day.person ? (
                        <p className="text-lg font-semibold text-primary mb-3">
                          {day.originalPerson} {"->"} {day.person}
                        </p>
                      ) : (
                        <p className="text-lg font-semibold text-primary mb-3">
                          {day.person}
                        </p>
                      )}

                    </div>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 border border-border shadow-sm text-center">
              <p className="text-muted-foreground">
                Nenhum plantão encontrado para {selectedPerson} em{" "}
                {monthName}
              </p>
            </Card>
          )}
        </div>

        {/* Summary */}
        <Card className="mt-8 p-6 border border-border shadow-sm bg-secondary/20">
          <h3 className="font-semibold text-foreground mb-4">
            {selectedPerson !== "all"
              ? `Plantões de ${selectedPerson}`
              : "Resumo do Mês"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedPerson !== "all"
                  ? "Total de Plantões"
                  : "Total de Dias Úteis"}
              </p>
              <p className="text-2xl font-bold text-primary">
                {schedule.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mês</p>
              <p className="text-2xl font-bold text-primary capitalize">
                {new Intl.DateTimeFormat("pt-BR", {
                  month: "short",
                }).format(new Date(currentYear, currentMonth))}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
