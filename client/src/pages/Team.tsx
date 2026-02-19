import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { getNextWorkingDays } from "@/lib/scheduleCalculator";
import { useSchedule } from "@/contexts/ScheduleContext";
import { Users } from "lucide-react";

export default function Team() {
  const today = new Date();
  const { teamMembers, isPersonOnTimeOff, holidays, shiftSwaps, scales } = useSchedule();
  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayInput = formatDateInput(today);
  const activeTeamMembers = teamMembers.filter((member) => {
    if (!member.removeDate) return true;
    return member.removeDate > todayInput;
  });
  const holidayDates = holidays.map((h) => h.date);
  const nextDays = getNextWorkingDays(
    today,
    30,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidayDates,
    shiftSwaps
  );

  // Contar quantas vezes cada pessoa aparece nos próximos 30 dias
  const countByPerson: Record<string, number> = {};
  activeTeamMembers.forEach((member) => {
    countByPerson[member.name] = 0;
  });

  nextDays.forEach((day) => {
    countByPerson[day.person]++;
  });

  // Ordenar por frequência
  const sortedByFrequency = activeTeamMembers.sort(
    (a, b) => countByPerson[b.name] - countByPerson[a.name]
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Equipe de Plantão
          </h1>
          <p className="text-muted-foreground">
            Conheça os membros da equipe e suas escalas
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedByFrequency.map((member, index) => {
            const count = countByPerson[member.name];
            const positionInOrder = activeTeamMembers.indexOf(member) + 1;

            return (
              <Card
                key={member.id}
                className="p-6 border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {member.name}
                      </h3>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50">
                    #{positionInOrder}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Próximos 30 dias
                    </p>
                    <p className="text-2xl font-bold text-primary">{count}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {count === 1 ? "plantão" : "plantões"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card className="mt-12 p-6 border border-border shadow-sm bg-secondary/20">
          <h3 className="font-semibold text-foreground mb-4">Informações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Total de Pessoas
              </p>
              <p className="text-3xl font-bold text-primary">
                {activeTeamMembers.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Ordem de Rotação
              </p>
              <div className="flex flex-wrap gap-2">
                {activeTeamMembers.map((member, index) => (
                  <Badge key={member.id} variant="outline" className="text-xs">
                    {index + 1}. {member.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
