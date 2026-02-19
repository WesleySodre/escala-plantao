import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useSchedule, type Scale } from "@/contexts/ScheduleContext";
import { isAdmin } from "@/auth/adminAuth";
import { Plus, Trash2, Pencil, Copy, GripVertical, Power } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
];

const ALL_WEEKDAYS = [1, 2, 3, 4, 5];

export default function Scales() {
  const admin = isAdmin();
  const {
    scales,
    teamMembers,
    addScale,
    updateScale,
    removeScale,
    toggleScaleActive,
    restoreDefaultScales,
  } = useSchedule();

  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Scale | null>(null);
  const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
  const [scaleName, setScaleName] = useState("");
  const [scaleWeekdays, setScaleWeekdays] = useState<number[]>([]);
  const [scaleRotationOrder, setScaleRotationOrder] = useState<string[]>([]);
  const [scaleActive, setScaleActive] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const memberById = useMemo(() => {
    return new Map(teamMembers.map((member) => [member.id, member]));
  }, [teamMembers]);

  const todayString = useMemo(() => getTodayString(), []);

  const dateFromString = (value: string) => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const isMemberActiveOnDate = (member: { joinDate: string; removeDate?: string }, date: Date) => {
    const joinDate = dateFromString(member.joinDate);
    if (joinDate && date < joinDate) return false;
    if (member.removeDate) {
      const removeDate = dateFromString(member.removeDate);
      if (removeDate && date >= removeDate) return false;
    }
    return true;
  };

  const activeMembersToday = useMemo(() => {
    const todayDate = dateFromString(todayString);
    if (!todayDate) return teamMembers;
    return teamMembers.filter((member) => isMemberActiveOnDate(member, todayDate));
  }, [teamMembers, todayString]);

  const activeMemberIds = useMemo(() => {
    return new Set(activeMembersToday.map((member) => member.id));
  }, [activeMembersToday]);

  const sortedScales = useMemo(() => {
    return [...scales].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [scales]);

  const formatWeekdays = (weekdays: number[]) => {
    const labels = weekdays
      .filter((day) => ALL_WEEKDAYS.includes(day))
      .sort((a, b) => a - b)
      .map((day) => WEEKDAY_OPTIONS.find((opt) => opt.value === day)?.label)
      .filter(Boolean) as string[];
    return labels.length > 0 ? labels.join(", ") : "Sem dias";
  };

  function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const normalizeRotationOrder = (order: string[]) => {
    const memberIds = activeMembersToday.map((member) => member.id);
    const seen = new Set<string>();
    const filtered = order.filter((id) => {
      if (!memberIds.includes(id)) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const missing = memberIds.filter((id) => !seen.has(id));
    return [...filtered, ...missing];
  };

  const getUncoveredWeekdays = (nextScales: Scale[]) => {
    const covered = new Set<number>();
    nextScales
      .filter((scale) => scale.isActive)
      .forEach((scale) => {
        scale.weekdays.forEach((day) => covered.add(day));
      });
    return ALL_WEEKDAYS.filter((day) => !covered.has(day));
  };

  const warnIfMissingWeekdays = (nextScales: Scale[]) => {
    const missing = getUncoveredWeekdays(nextScales);
    if (missing.length > 0) {
      toast(`Sem escala configurada para: ${formatWeekdays(missing)}`);
    }
  };

  const getConflictingWeekdays = (weekdays: number[], ignoreId?: string | null) => {
    const conflicts = new Set<number>();
    scales.forEach((scale) => {
      if (!scale.isActive) return;
      if (ignoreId && scale.id === ignoreId) return;
      scale.weekdays.forEach((day) => {
        if (weekdays.includes(day)) {
          conflicts.add(day);
        }
      });
    });
    return Array.from(conflicts);
  };

  const openCreateDialog = () => {
    if (activeMembersToday.length === 0) {
      toast.error("Adicione membros antes de criar uma escala");
      return;
    }
    setEditingScaleId(null);
    setScaleName("");
    setScaleWeekdays([]);
    setScaleRotationOrder(activeMembersToday.map((member) => member.id));
    setScaleActive(true);
    setShowScaleDialog(true);
  };

  const openEditDialog = (scale: Scale) => {
    setEditingScaleId(scale.id);
    setScaleName(scale.name);
    setScaleWeekdays([...scale.weekdays]);
    setScaleRotationOrder(normalizeRotationOrder(scale.rotationMemberIds));
    setScaleActive(scale.isActive);
    setShowScaleDialog(true);
  };

  const handleSaveScale = () => {
    const trimmedName = scaleName.trim();
    if (!trimmedName) {
      toast.error("Nome da escala é obrigatório");
      return;
    }
    if (scaleWeekdays.length === 0) {
      toast.error("Selecione pelo menos um dia da semana");
      return;
    }
    const normalizedWeekdays = Array.from(new Set(scaleWeekdays)).sort((a, b) => a - b);
    const normalizedRotation = normalizeRotationOrder(scaleRotationOrder);
    if (normalizedRotation.length === 0) {
      toast.error("Selecione pelo menos um membro na rotação");
      return;
    }
    if (scaleActive) {
      const conflicts = getConflictingWeekdays(normalizedWeekdays, editingScaleId);
      if (conflicts.length > 0) {
        toast.error(`Conflito de dias: ${formatWeekdays(conflicts)}`);
        return;
      }
    }

    if (editingScaleId) {
      const updates: Partial<Scale> = {
        name: trimmedName,
        weekdays: normalizedWeekdays,
        rotationMemberIds: normalizedRotation,
        isActive: scaleActive,
      };
      const nextScales = scales.map((scale) =>
        scale.id === editingScaleId ? { ...scale, ...updates } : scale
      );
      updateScale(editingScaleId, updates);
      warnIfMissingWeekdays(nextScales);
      toast.success("Escala atualizada");
    } else {
      const today = getTodayString();
      const newScale: Scale = {
        id: Date.now().toString(),
        name: trimmedName,
        weekdays: normalizedWeekdays,
        rotationMemberIds: normalizedRotation,
        isActive: scaleActive,
        createdAt: today,
        anchorDate: today,
        anchorMemberId: normalizedRotation[0],
      };
      const nextScales = [...scales, newScale];
      addScale(newScale);
      warnIfMissingWeekdays(nextScales);
      toast.success("Escala criada");
    }

    setShowScaleDialog(false);
    setEditingScaleId(null);
  };

  const handleToggleActive = (scale: Scale) => {
    if (!scale.isActive) {
      const conflicts = getConflictingWeekdays(scale.weekdays, scale.id);
      if (conflicts.length > 0) {
        toast.error(`Conflito de dias: ${formatWeekdays(conflicts)}`);
        return;
      }
    }
    const nextScales = scales.map((item) =>
      item.id === scale.id ? { ...item, isActive: !scale.isActive } : item
    );
    toggleScaleActive(scale.id, !scale.isActive);
    warnIfMissingWeekdays(nextScales);
    toast.success(scale.isActive ? "Escala desativada" : "Escala ativada");
  };

  const handleDuplicateScale = (scale: Scale) => {
    const today = getTodayString();
    const duplicated: Scale = {
      ...scale,
      id: Date.now().toString(),
      name: `${scale.name} (copia)`,
      isActive: false,
      createdAt: today,
      anchorDate: today,
      anchorMemberId: scale.rotationMemberIds[0],
    };
    addScale(duplicated);
    toast.success("Escala duplicada");
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const nextScales = scales.filter((scale) => scale.id !== pendingDelete.id);
    removeScale(pendingDelete.id);
    warnIfMissingWeekdays(nextScales);
    toast.success("Escala removida");
    setPendingDelete(null);
  };

  const handleDragStart =
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop =
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const fromIndex =
        dragIndex ?? Number(event.dataTransfer.getData("text/plain"));
      if (Number.isNaN(fromIndex) || fromIndex === index) {
        setDragIndex(null);
        return;
      }
      setScaleRotationOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(index, 0, moved);
        return next;
      });
      setDragIndex(null);
    };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Escalas</h1>
          <p className="text-muted-foreground">
            Crie, edite e organize as escalas por dia da semana.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Button onClick={openCreateDialog} className="gap-2" disabled={!admin}>
            <Plus size={18} />
            Nova escala
          </Button>
          <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={!admin}>
                Restaurar escalas padrão
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar escalas padrão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá substituir as escalas atuais pelas escalas padrão do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    restoreDefaultScales();
                    setShowRestoreDialog(false);
                    toast.success("Escalas padrão restauradas");
                  }}
                  disabled={!admin}
                >
                  Restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
          {sortedScales.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma escala cadastrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Nome
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Dias
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Pessoas
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedScales.map((scale) => (
                    <tr key={scale.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground font-medium">
                        {scale.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatWeekdays(scale.weekdays)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {scale.rotationMemberIds.filter((id) => activeMemberIds.has(id)).length}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={scale.isActive ? "default" : "secondary"}>
                          {scale.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(scale)}
                            className="gap-1"
                            disabled={!admin}
                          >
                            <Power size={14} />
                            {scale.isActive ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(scale)}
                            className="gap-1"
                            disabled={!admin}
                          >
                            <Pencil size={14} />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateScale(scale)}
                            className="gap-1"
                            disabled={!admin}
                          >
                            <Copy size={14} />
                            Duplicar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(scale)}
                            className="gap-1 text-destructive hover:text-destructive"
                            disabled={!admin}
                          >
                            <Trash2 size={14} />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog
          open={showScaleDialog}
          onOpenChange={(open) => {
            setShowScaleDialog(open);
            if (!open) {
              setEditingScaleId(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingScaleId ? "Editar escala" : "Nova escala"}
              </DialogTitle>
              <DialogDescription>
                Defina os dias cobertos e a ordem de rotação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="scale-name">Nome</Label>
                <Input
                  id="scale-name"
                  value={scaleName}
                  onChange={(event) => setScaleName(event.target.value)}
                  placeholder="Ex: Seg-Qui"
                />
              </div>
              <div>
                <Label>Dias da semana</Label>
                <div className="grid grid-cols-5 gap-3 mt-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label key={day.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={scaleWeekdays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          setScaleWeekdays((prev) => {
                            if (checked === true) {
                              const next = Array.from(new Set([...prev, day.value]));
                              return next.sort((a, b) => a - b);
                            }
                            return prev.filter((value) => value !== day.value);
                          });
                        }}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Ordem de rotação</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                  {scaleRotationOrder.map((memberId, index) => {
                    const member = memberById.get(memberId);
                    return (
                      <div
                        key={memberId}
                        draggable
                        onDragStart={handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border cursor-move"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical size={16} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {member?.name ?? "Membro"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={scaleActive}
                  onCheckedChange={(checked) => setScaleActive(checked === true)}
                  disabled={!admin}
                />
                <span className="text-sm">Escala ativa</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScaleDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveScale} className="flex-1" disabled={!admin}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir escala?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete
                  ? `Deseja remover a escala "${pendingDelete.name}"?`
                  : "Deseja remover esta escala?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={!admin}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
