import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { DEFAULT_HOLIDAYS, useSchedule } from "@/contexts/ScheduleContext";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Holidays() {
  const { holidays, addHoliday, removeHoliday, replaceHolidays } = useSchedule();
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");

  const handleAddHoliday = () => {
    if (!holidayDate || !holidayName.trim()) {
      toast.error("Preencha data e nome do feriado");
      return;
    }

    // Verificar se a data já existe
    if (holidays.some((h) => h.date === holidayDate)) {
      toast.error("Esta data já está cadastrada como feriado");
      return;
    }

    addHoliday(holidayDate, holidayName);
    setHolidayDate("");
    setHolidayName("");
    setShowAddHoliday(false);
    toast.success(`Feriado "${holidayName}" adicionado em ${holidayDate}`);
  };

  const handleRemoveHoliday = (id: string, name: string) => {
    removeHoliday(id);
    toast.success(`Feriado "${name}" removido`);
  };

  const handleRestoreDefaults = () => {
    const defaults = DEFAULT_HOLIDAYS.map((holiday) => ({ ...holiday }));
    replaceHolidays(defaults);
    setShowRestoreDialog(false);
    toast.success("Feriados padrões restaurados");
  };

  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Gerenciamento de Feriados</h1>
          <p className="text-muted-foreground">
            Adicione, edite ou remova feriados. O calendário será atualizado automaticamente.
          </p>
        </div>

        {/* Add Holiday Button */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Dialog open={showAddHoliday} onOpenChange={setShowAddHoliday}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={18} />
                Adicionar Feriado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Feriado</DialogTitle>
                <DialogDescription>
                  Adicione uma nova data de feriado ou suspensão de expediente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="holiday-date">Data</Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <Label htmlFor="holiday-name">Nome do Feriado</Label>
                  <Input
                    id="holiday-name"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="Ex: Carnaval, Recesso, etc."
                  />
                </div>
                <Button onClick={handleAddHoliday} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Restaurar feriados padrões</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar feriados padrões?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isto substituirá a lista atual pelos feriados padrões do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestoreDefaults}>
                  Restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Holidays List */}
        <div className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
          {sortedHolidays.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-muted-foreground">Nenhum feriado cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Data</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nome</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedHolidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground font-medium">
                        {formatDate(holiday.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{holiday.name}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHoliday(holiday.id, holiday.name)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-8 p-6 bg-muted rounded-lg border border-border">
          <h3 className="font-semibold text-foreground mb-2">Resumo</h3>
          <p className="text-sm text-muted-foreground">
            Total de feriados cadastrados: <span className="font-semibold text-foreground">{sortedHolidays.length}</span>
          </p>
        </div>
      </div>
    </Layout>
  );
}
