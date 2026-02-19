import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import {
  getScheduledPerson,
  getNextWorkingDays,
  getActiveScaleForDate,
  isWorkingDay,
} from "@/lib/scheduleCalculator";
import { useSchedule } from "@/contexts/ScheduleContext";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function Home() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { teamMembers, isPersonOnTimeOff, holidays, shiftSwaps, scales } = useSchedule();
  const holidayDates = holidays.map((h) => h.date);
  const todaySchedule = getScheduledPerson(
    today,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidayDates,
    shiftSwaps
  );
  const nextDays = getNextWorkingDays(
    today,
    7,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidayDates,
    shiftSwaps
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  };

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = formatDateInput(date);
    return holidays.find((holiday) => holiday.date === dateStr) ?? null;
  };

  const holidayForToday = getHolidayForDate(today);
  const isWeekendToday = today.getDay() === 0 || today.getDay() === 6;
  const isWorkingToday = isWorkingDay(today, holidayDates);
  const todayScale = getActiveScaleForDate(today, scales);
  const todayInput = formatDateInput(today);
  const activeTeamMembers = teamMembers.filter((member) => {
    if (!member.removeDate) return true;
    return member.removeDate > todayInput;
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Escala de Plantão
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de plantão - Hortolândia 2026
          </p>
        </div>

        {/* Plantão de Hoje */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Plantão de Hoje
          </h2>

          {todaySchedule ? (
            <Card className="p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {formatDate(today)}
                  </p>
                  <p className="text-4xl font-bold text-primary mb-2">
                    {todaySchedule.person}
                  </p>
                </div>
                <div className="text-right">
                  <CheckCircle2 className="text-green-600 mb-2" size={48} />
                  <p className="text-sm text-muted-foreground">
                    Dia útil confirmado
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 border border-border shadow-sm bg-amber-50">
              <div className="flex items-center gap-4">
                <AlertCircle className="text-amber-600" size={32} />
                <div>
                  <p className="font-semibold text-amber-900">
                    Sem plantão hoje
                  </p>
                  <p className="text-sm text-amber-700">
                    {isWeekendToday
                      ? "Hoje é fim de semana"
                      : holidayForToday?.name
                      ? holidayForToday.name
                      : !isWorkingToday
                      ? "Hoje é feriado ou suspensão de expediente"
                      : !todayScale
                      ? "Sem escala configurada para hoje"
                      : "Nenhum membro disponível para hoje"}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Próximos Dias */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Próximos Dias Úteis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nextDays.map((day, index) => (
              <Card
                key={index}
                className="p-4 border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {day.dayOfWeek}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDateShort(day.date)}
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-lg font-semibold text-primary">
                    {day.person}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Informações Gerais */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border border-border shadow-sm">
            <p className="text-sm text-muted-foreground mb-2">Total de Pessoas</p>
            <p className="text-3xl font-bold text-primary">{activeTeamMembers.length}</p>
          </Card>

          <Card className="p-4 border border-border shadow-sm">
            <p className="text-sm text-muted-foreground mb-2">Escalas</p>
            <p className="text-3xl font-bold text-primary">
              {scales.filter((scale) => scale.isActive).length}
            </p>
          </Card>

          <Card className="p-4 border border-border shadow-sm">
            <p className="text-sm text-muted-foreground mb-2">Ano</p>
            <p className="text-3xl font-bold text-primary">2026</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
