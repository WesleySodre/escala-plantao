import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { getScheduledPerson, isWorkingDay, getActiveScaleForDate } from "@/lib/scheduleCalculator";
import { useSchedule } from "@/contexts/ScheduleContext";
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedPerson, setSelectedPerson] = useState<string>("all");
  const [showReorderMode, setShowReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [rotationTarget, setRotationTarget] = useState<string>("all");

  const {
    teamMembers,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberWorkDays,
    isPersonOnTimeOff,
    addTimeOff,
    removeTimeOff,
    timeOffs,
    shiftSwaps,
    addShiftSwap,
    updateShiftSwap,
    removeShiftSwap,
    holidays,
    scales,
    updateScale,
  } = useSchedule();

  // Dialog states
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [showAddTimeOff, setShowAddTimeOff] = useState(false);
  const [timeOffPerson, setTimeOffPerson] = useState("");
  const [timeOffStartDate, setTimeOffStartDate] = useState("");
  const [timeOffType, setTimeOffType] = useState<"vacation" | "license">("vacation");
  const [timeOffDays, setTimeOffDays] = useState("1");
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapDate, setSwapDate] = useState("");
  const [swapOriginal, setSwapOriginal] = useState("");
  const [swapSubstitute, setSwapSubstitute] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [editingSwapId, setEditingSwapId] = useState<string | null>(null);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [removeMemberDate, setRemoveMemberDate] = useState("");
  const [removeMemberMode, setRemoveMemberMode] = useState<"date" | "now">("date");
  const [showWorkDaysDialog, setShowWorkDaysDialog] = useState(false);
  const [memberToEditWorkDays, setMemberToEditWorkDays] = useState<string | null>(null);
  const [workDaysSelection, setWorkDaysSelection] = useState<number[]>([1, 2, 3, 4, 5]);

  const workDayOptions = [
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
  ];

  const DEFAULT_ORDER = [
    "Benedito",
    "Mauro",
    "Cláudia",
    "Rosana",
    "José Claudio",
    "Katia",
    "Daniel",
    "Leonardo",
    "Wesley",
    "Lúcia",
    "Luis",
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

  const formatDateDisplay = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatDateLabel = (value: string) => {
    const parsed = parseDateInput(value);
    return parsed ? formatDateDisplay(parsed) : value;
  };

  const getReturnDateLabel = (startDate: string, days: number) => {
    const start = parseDateInput(startDate);
    if (!start || !Number.isFinite(days) || days < 1) return "";
    const returnDate = new Date(start);
    returnDate.setDate(returnDate.getDate() + days);
    return formatDateDisplay(returnDate);
  };

  const getReturnDateForTimeOff = () => {
    const start = parseDateInput(timeOffStartDate);
    const days = Number(timeOffDays);
    if (!start || !Number.isFinite(days) || days < 1) return null;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + days - 1);
    const returnDate = new Date(endDate);
    returnDate.setDate(returnDate.getDate() + 1);
    return returnDate;
  };

  const todayInput = formatDateInput(new Date());
  const todayDate = parseDateInput(todayInput);
  const memberToRemoveData = memberToRemove
    ? teamMembers.find((member) => member.id === memberToRemove)
    : null;
  const memberToEditWorkDaysData = memberToEditWorkDays
    ? teamMembers.find((member) => member.id === memberToEditWorkDays)
    : null;
  const timeOffReturnDate = getReturnDateForTimeOff();
  const timeOffReturnDateInput = timeOffReturnDate ? formatDateInput(timeOffReturnDate) : "";
  const timeOffReturnDateLabel = timeOffReturnDate ? formatDateDisplay(timeOffReturnDate) : "";
  const holidayDates = holidays.map((h) => h.date);
  const sortedShiftSwaps = [...shiftSwaps].sort((a, b) => a.date.localeCompare(b.date));
  const parsedSwapDate = parseDateInput(swapDate);
  const isSwapWorkingDay = parsedSwapDate ? isWorkingDay(parsedSwapDate, holidayDates) : true;
  const swapScale = parsedSwapDate ? getActiveScaleForDate(parsedSwapDate, scales) : null;
  const isSwapScaleConfigured = parsedSwapDate ? Boolean(swapScale) : true;

  const activeTeamMembers = teamMembers.filter((member) => {
    if (!member.removeDate) return true;
    const removeDate = parseDateInput(member.removeDate);
    if (!removeDate || !todayDate) return true;
    return removeDate > todayDate;
  });

  const sortedScales = [...scales].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const activeMemberIds = activeTeamMembers.map((member) => member.id);

  useEffect(() => {
    if (
      selectedPerson !== "all" &&
      !activeTeamMembers.some((member) => member.name === selectedPerson)
    ) {
      setSelectedPerson("all");
    }
  }, [activeTeamMembers, selectedPerson]);

  const normalizeName = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  };

  const getScaleById = (id: string) => {
    return scales.find((scale) => scale.id === id) ?? null;
  };

  const getDefaultRotationScale = () => {
    const segQui = scales.find((scale) => normalizeName(scale.name) === "seg-qui");
    if (segQui) return segQui;
    const sexta = scales.find((scale) => normalizeName(scale.name) === "sexta");
    if (sexta) return sexta;
    return scales[0] ?? null;
  };

  const getRotationTargetLabel = (target: string) => {
    if (target === "all") return "Todas as escalas";
    return getScaleById(target)?.name ?? "Escala";
  };

  const buildRotationListForScale = (scale: { rotationMemberIds: string[] } | null) => {
    if (!scale) return [...activeMemberIds];
    const ordered = scale.rotationMemberIds.filter((id) => activeMemberIds.includes(id));
    const missing = activeMemberIds.filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  };

  const normalizeRotationList = (list: string[]) => {
    const seen = new Set<string>();
    const filtered = list.filter((id) => {
      if (!activeMemberIds.includes(id)) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const missing = activeMemberIds.filter((id) => !seen.has(id));
    return [...filtered, ...missing];
  };

  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(currentYear, currentMonth));

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

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

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      toast.error("Nome do membro é obrigatório");
      return;
    }
    addTeamMember(newMemberName);
    setNewMemberName("");
    setShowAddMember(false);
    toast.success(`${newMemberName} adicionado à equipe`);
  };

  const handleOpenRemoveMemberDialog = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;
    setMemberToRemove(member.id);
    setRemoveMemberDate(member.removeDate ?? "");
    setRemoveMemberMode("date");
    setShowRemoveMemberDialog(true);
  };

  const handleConfirmRemoveMember = () => {
    if (!memberToRemoveData) {
      toast.error("Selecione um membro");
      return;
    }
    const effectiveRemoveDate = removeMemberMode === "now" ? todayInput : removeMemberDate;
    if (!effectiveRemoveDate) {
      toast.error("Selecione a data de remocao");
      return;
    }
    removeTeamMember(memberToRemoveData.id, effectiveRemoveDate);
    setShowRemoveMemberDialog(false);
    setMemberToRemove(null);
    setRemoveMemberDate("");
    setRemoveMemberMode("date");
    toast.success(`${memberToRemoveData.name} removido a partir de ${effectiveRemoveDate}`);
  };

  const handleCloseRemoveMemberDialog = () => {
    setShowRemoveMemberDialog(false);
    setMemberToRemove(null);
    setRemoveMemberDate("");
    setRemoveMemberMode("date");
  };

  const handleAddTimeOff = () => {
    if (!timeOffPerson || !timeOffStartDate || !timeOffDays) {
      toast.error("Preencha todos os campos");
      return;
    }
    addTimeOff(timeOffPerson, timeOffStartDate, timeOffType, parseInt(timeOffDays));
    setTimeOffPerson("");
    setTimeOffStartDate("");
    setTimeOffDays("1");
    setShowAddTimeOff(false);
    toast.success(`Férias/Licença adicionada para ${timeOffPerson}`);
  };

  const handleRemoveTimeOff = (id: string) => {
    removeTimeOff(id);
    toast.success("Férias/Licença removida");
  };

  const resetSwapForm = () => {
    setSwapDate("");
    setSwapOriginal("");
    setSwapSubstitute("");
    setSwapReason("");
    setEditingSwapId(null);
  };

  const openSwapDialog = () => {
    resetSwapForm();
    const defaultDate = todayInput;
    setSwapDate(defaultDate);
    handleSwapDateChange(defaultDate);
    setShowSwapDialog(true);
  };

  const openSwapEditDialog = (swapId: string) => {
    const swap = shiftSwaps.find((entry) => entry.id === swapId);
    if (!swap) return;
    setSwapDate(swap.date);
    setSwapOriginal(swap.originalPerson);
    setSwapSubstitute(swap.substitutePerson);
    setSwapReason(swap.reason ?? "");
    setEditingSwapId(swap.id);
    setShowSwapDialog(true);
  };

  const handleSwapDateChange = (value: string) => {
    setSwapDate(value);
    const existingSwap = shiftSwaps.find((entry) => entry.date === value);
    if (existingSwap) {
      setSwapOriginal(existingSwap.originalPerson);
      setSwapSubstitute(existingSwap.substitutePerson);
      setSwapReason(existingSwap.reason ?? "");
      setEditingSwapId(existingSwap.id);
      return;
    }
    setEditingSwapId(null);
    setSwapSubstitute("");
    setSwapReason("");
    const parsedDate = parseDateInput(value);
    if (!parsedDate) {
      setSwapOriginal("");
      return;
    }
    const schedule = getScheduledPerson(
      parsedDate,
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidayDates,
      shiftSwaps
    );
    setSwapOriginal(schedule?.person ?? "");
  };

  const handleSaveSwap = () => {
    if (!swapDate) {
      toast.error("Selecione a data do plantão");
      return;
    }
    const parsedDate = parseDateInput(swapDate);
    if (!parsedDate) {
      toast.error("Data inválida");
      return;
    }
    if (!isWorkingDay(parsedDate, holidayDates)) {
      toast.error("Selecione um dia útil que não seja feriado");
      return;
    }
    const scaleForSwap = getActiveScaleForDate(parsedDate, scales);
    if (!scaleForSwap) {
      toast.error("Nenhuma escala configurada para esse dia");
      return;
    }
    if (!swapOriginal || !swapSubstitute) {
      toast.error("Selecione o original e o substituto");
      return;
    }
    if (swapOriginal === swapSubstitute) {
      toast.error("O substituto não pode ser o mesmo que o original");
      return;
    }

    if (editingSwapId) {
      updateShiftSwap(editingSwapId, {
        date: swapDate,
        originalPerson: swapOriginal,
        substitutePerson: swapSubstitute,
        reason: swapReason.trim() || undefined,
      });
      toast.success("Troca de plantão atualizada");
    } else {
      addShiftSwap(
        swapDate,
        swapOriginal,
        swapSubstitute,
        swapReason.trim() || undefined
      );
      toast.success("Troca de plantão registrada");
    }
    setShowSwapDialog(false);
    resetSwapForm();
  };

  const handleRemoveSwap = (id: string) => {
    removeShiftSwap(id);
    toast.success("Troca de plantão removida");
  };

  const handleOpenWorkDaysDialog = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;
    setMemberToEditWorkDays(member.id);
    setWorkDaysSelection(Array.isArray(member.workDays) ? member.workDays : [1, 2, 3, 4, 5]);
    setShowWorkDaysDialog(true);
  };

  const handleToggleWorkDay = (day: number, checked: boolean) => {
    setWorkDaysSelection((prev) => {
      if (checked) {
        const next = Array.from(new Set([...prev, day]));
        return next.sort((a, b) => a - b);
      }
      return prev.filter((d) => d !== day);
    });
  };

  const handleSaveWorkDays = () => {
    if (!memberToEditWorkDaysData) {
      toast.error("Selecione um membro");
      return;
    }
    if (workDaysSelection.length === 0) {
      toast.error("Selecione pelo menos um dia");
      return;
    }
    const sortedDays = [...workDaysSelection].sort((a, b) => a - b);
    updateTeamMemberWorkDays(memberToEditWorkDaysData.id, sortedDays);
    setShowWorkDaysDialog(false);
    setMemberToEditWorkDays(null);
    toast.success(`Dias de plantao atualizados para ${memberToEditWorkDaysData.name}`);
  };

  const handleCloseWorkDaysDialog = () => {
    setShowWorkDaysDialog(false);
    setMemberToEditWorkDays(null);
  };

  const handleOpenReorderDialog = () => {
    if (scales.length === 0) {
      toast.error("Nenhuma escala configurada para organizar.");
      return;
    }
    const defaultScale = getDefaultRotationScale();
    const initialTarget = defaultScale ? defaultScale.id : "all";
    setRotationTarget(initialTarget);
    setReorderList(buildRotationListForScale(defaultScale));
    setShowReorderMode(true);
  };

  const handleRotationTargetChange = (value: string) => {
    setRotationTarget(value);
    const targetScale = value === "all" ? getDefaultRotationScale() : getScaleById(value);
    setReorderList(buildRotationListForScale(targetScale));
  };

  const handleSaveReorder = () => {
    if (activeTeamMembers.length === 0) {
      toast.error("Nenhum membro na equipe para organizar.");
      return;
    }
    const normalizedOrder = normalizeRotationList(reorderList);
    if (rotationTarget === "all") {
      scales.forEach((scale) => {
        updateScale(scale.id, { rotationMemberIds: normalizedOrder });
      });
      setShowReorderMode(false);
      toast.success("Rotação atualizada para todas as escalas!");
      return;
    }
    const targetScale = getScaleById(rotationTarget);
    if (!targetScale) {
      toast.error("Selecione uma escala para salvar.");
      return;
    }
    updateScale(targetScale.id, { rotationMemberIds: normalizedOrder });
    setShowReorderMode(false);
    toast.success(`Rotação atualizada para ${targetScale.name}!`);
  };

  const handleRestoreDefaultOrder = () => {
    if (activeTeamMembers.length === 0) {
      toast.error("Nenhum membro na equipe para restaurar a ordem.");
      return;
    }

    try {
      const normalizedToMembers = new Map<string, string[]>();
      activeTeamMembers.forEach((member) => {
        const key = normalizeName(member.name);
        const list = normalizedToMembers.get(key) ?? [];
        list.push(member.id);
        normalizedToMembers.set(key, list);
      });

      const orderedIds: string[] = [];
      const usedIds = new Set<string>();

      DEFAULT_ORDER.forEach((defaultName) => {
        const key = normalizeName(defaultName);
        const candidates = normalizedToMembers.get(key);
        if (!candidates) return;
        const nextId = candidates.find((id) => !usedIds.has(id));
        if (!nextId) return;
        usedIds.add(nextId);
        orderedIds.push(nextId);
      });

      activeTeamMembers.forEach((member) => {
        if (usedIds.has(member.id)) return;
        usedIds.add(member.id);
        orderedIds.push(member.id);
      });

      const normalizedOrder = normalizeRotationList(orderedIds);
      if (rotationTarget === "all") {
        scales.forEach((scale) => {
          updateScale(scale.id, { rotationMemberIds: normalizedOrder });
        });
        setReorderList(normalizedOrder);
        setShowReorderMode(false);
        toast.success("Ordem padrão restaurada para todas as escalas!");
        return;
      }
      const targetScale = getScaleById(rotationTarget);
      if (!targetScale) {
        toast.error("Selecione uma escala para restaurar.");
        return;
      }
      updateScale(targetScale.id, { rotationMemberIds: normalizedOrder });
      setReorderList(normalizedOrder);
      setShowReorderMode(false);
      toast.success(`Ordem padrão restaurada para ${targetScale.name}!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Erro ao restaurar ordem padrão:", error);
      toast.error(`Não foi possível restaurar a ordem padrão: ${message}`);
    }
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
      setReorderList((prev) => {
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

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarDays: (number | null)[] = [];

  // Add empty days for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getScheduleForDay = (day: number | null) => {
    if (!day) return null;
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;

    // Converter feriados para array de strings (YYYY-MM-DD)
    // Passar a lista de membros e a funcao de deteccao de ferias
    return getScheduledPerson(date, teamMembers, scales, isPersonOnTimeOff, holidayDates, shiftSwaps);
  };

  const getHolidayForDay = (day: number | null) => {
    if (!day) return null;
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = formatDateInput(date);
    return holidays.find((holiday) => holiday.date === dateStr) ?? null;
  };

  const getScaleForDay = (day: number | null) => {
    if (!day) return null;
    const date = new Date(currentYear, currentMonth, day);
    return getActiveScaleForDate(date, scales);
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const date = new Date(currentYear, currentMonth, day);
    const todayDate = new Date();
    return (
      date.getDate() === todayDate.getDate() &&
      date.getMonth() === todayDate.getMonth() &&
      date.getFullYear() === todayDate.getFullYear()
    );
  };

  const isWeekend = (day: number | null) => {
    if (!day) return false;
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const shouldShowSchedule = (day: number | null) => {
    if (!day) return false;
    const schedule = getScheduleForDay(day);
    if (!schedule) return false;
    if (selectedPerson === "all") return true;
    return schedule.person === selectedPerson;
  };

  const rotationTargets = [
    { value: "all", label: "Todas as escalas" },
    ...sortedScales.map((scale) => ({ value: scale.id, label: scale.name })),
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Escala de Plantão</h1>
          <p className="text-muted-foreground">Gerenciamento de plantão - Hortolândia 2026</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" size="sm" onClick={handlePrevMonth} className="gap-2">
                <ChevronLeft size={16} />
                Anterior
              </Button>

              <h2 className="text-2xl font-semibold text-foreground capitalize">{monthName}</h2>

              <Button variant="outline" size="sm" onClick={handleNextMonth} className="gap-2">
                Próximo
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Filter */}
            <div className="mb-6 flex items-center gap-4">
              <Label htmlFor="person-filter" className="font-medium">
                Filtrar por:
              </Label>
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as pessoas</SelectItem>
                  {activeTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calendar Grid */}
            <div className="p-6 border border-border shadow-sm rounded-lg bg-card">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day) => (
                  <div key={day} className="text-center font-semibold text-sm text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {weeks.map((week, weekIndex) =>
                  week.map((day, dayIndex) => {
                    const schedule = getScheduleForDay(day);
                    const isTodayDate = isToday(day);
                    const isWeekendDay = isWeekend(day);
                    const holiday = getHolidayForDay(day);
                    const isHolidayDay = Boolean(holiday);
                    const scaleForDay = getScaleForDay(day);
                    const shouldShow = shouldShowSchedule(day);

                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`min-h-24 p-2 rounded-lg border transition-colors ${
                          !day
                            ? "bg-transparent border-transparent"
                            : isWeekendDay
                            ? "bg-muted border-border"
                            : isTodayDate
                            ? "bg-primary/10 border-primary"
                            : "bg-card border-border"
                        }`}
                      >
                        {day && (
                          <>
                            <div className={`text-sm font-semibold mb-1 ${isTodayDate ? "text-primary" : "text-foreground"}`}>
                              {day}
                            </div>
                            {isWeekendDay ? (
                              <div className="text-xs text-muted-foreground italic">
                                Final de semana
                              </div>
                            ) : isHolidayDay ? (
                              <div className="text-xs text-muted-foreground italic">
                                {holiday?.name ?? "Feriado"}
                              </div>
                            ) : !scaleForDay ? (
                              <div className="text-xs text-muted-foreground italic">
                                Sem escala configurada
                              </div>
                            ) : shouldShow ? (
                              <div className="text-xs">
                                {schedule?.originalPerson &&
                                schedule.originalPerson !== schedule.person ? (
                                  <>
                                    <div className="font-medium text-muted-foreground line-through">
                                      {schedule.originalPerson}
                                    </div>
                                    <div className="font-medium text-accent">
                                      {schedule.person}
                                    </div>
                                    {schedule.swapReason && (
                                      <div className="text-xs text-muted-foreground">
                                        {schedule.swapReason}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="font-medium text-accent">{schedule?.person}</div>
                                )}
                              </div>
                            ) : selectedPerson !== "all" ? (
                              <div className="text-xs text-muted-foreground">-</div>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Section */}
            <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Equipe ({activeTeamMembers.length})</h3>
                <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Plus size={16} />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Membro</DialogTitle>
                      <DialogDescription>
                        Adicione um novo membro à equipe de plantão
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="member-name">Nome</Label>
                        <Input
                          id="member-name"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="Nome do membro"
                        />
                      </div>
                      <Button onClick={handleAddMember} className="w-full">
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Reorder Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-4 gap-2"
                onClick={handleOpenReorderDialog}
              >
                <GripVertical size={16} />
                Organizar Rotação
              </Button>

              {/* Team List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activeTeamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenWorkDaysDialog(member.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenWorkDaysDialog(member.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{member.name}</span>
                      {member.removeDate && (
                        <Badge variant="outline" className="text-xs">
                          Sai em {member.removeDate}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenRemoveMemberDialog(member.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>

          {/* Remove Member Dialog */}
          <Dialog
            open={showRemoveMemberDialog}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseRemoveMemberDialog();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover Membro</DialogTitle>
                <DialogDescription>
                  {memberToRemoveData
                    ? `Escolha como remover ${memberToRemoveData.name}.`
                    : "Escolha o tipo de remoção do membro."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Tipo de exclusao</Label>
                  <RadioGroup
                    value={removeMemberMode}
                    onValueChange={(value) => setRemoveMemberMode(value as "date" | "now")}
                  >
                    <label className="flex items-start gap-3 text-sm">
                      <RadioGroupItem value="date" />
                      <span>
                        <span className="font-medium">Remover a partir de (data)</span>
                        <span className="block text-xs text-muted-foreground">
                          Mantem o historico anterior e remove apenas a partir da data escolhida.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm">
                      <RadioGroupItem value="now" />
                      <span>
                        <span className="font-medium">Excluir permanentemente a partir de agora</span>
                        <span className="block text-xs text-muted-foreground">
                          Remove imediatamente da lista e recalcula a escala futura.
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </div>
                {removeMemberMode === "date" ? (
                  <div className="space-y-2">
                    <Label htmlFor="remove-date">Remover a partir de:</Label>
                    <Input
                      id="remove-date"
                      type="date"
                      min={todayInput}
                      value={removeMemberDate}
                      onChange={(event) => setRemoveMemberDate(event.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="remove-date-now">Remover a partir de:</Label>
                    <Input
                      id="remove-date-now"
                      type="date"
                      value={todayInput}
                      readOnly
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseRemoveMemberDialog}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmRemoveMember}
                    className="flex-1"
                    disabled={removeMemberMode === "date" && !removeMemberDate}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Work Days Dialog */}
          <Dialog
            open={showWorkDaysDialog}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseWorkDaysDialog();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dias de Plantao</DialogTitle>
                <DialogDescription>
                  {memberToEditWorkDaysData
                    ? `Configure os dias de plantao de ${memberToEditWorkDaysData.name}.`
                    : "Configure os dias de plantao do membro."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Dias da semana (seg-sex)</Label>
                  <div className="grid grid-cols-5 gap-3">
                    {workDayOptions.map((day) => (
                      <label key={day.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={workDaysSelection.includes(day.value)}
                          onCheckedChange={(checked) =>
                            handleToggleWorkDay(day.value, checked === true)
                          }
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseWorkDaysDialog}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveWorkDays}
                    className="flex-1"
                    disabled={workDaysSelection.length === 0}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Shift Swap Dialog */}
          <Dialog
            open={showSwapDialog}
            onOpenChange={(open) => {
              setShowSwapDialog(open);
              if (!open) {
                resetSwapForm();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSwapId ? "Editar Troca de Plantão" : "Registrar Troca de Plantão"}
                </DialogTitle>
                <DialogDescription>
                  Substituição pontual para um dia específico.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="swap-date">Data do plantão</Label>
                  <Input
                    id="swap-date"
                    type="date"
                    value={swapDate}
                    onChange={(event) => handleSwapDateChange(event.target.value)}
                    disabled={Boolean(editingSwapId)}
                  />
                  {!isSwapWorkingDay && swapDate && (
                    <p className="text-xs text-destructive mt-2">
                      Dia sem expediente. Selecione um dia útil que não seja feriado.
                    </p>
                  )}
                  {isSwapWorkingDay && !isSwapScaleConfigured && swapDate && (
                    <p className="text-xs text-destructive mt-2">
                      Sem escala configurada para esse dia.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="swap-original">Original (A)</Label>
                  <Select value={swapOriginal} onValueChange={setSwapOriginal}>
                    <SelectTrigger id="swap-original">
                      <SelectValue placeholder="Selecione o original" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTeamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.name}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="swap-substitute">Substituto (B)</Label>
                  <Select value={swapSubstitute} onValueChange={setSwapSubstitute}>
                    <SelectTrigger id="swap-substitute">
                      <SelectValue placeholder="Selecione o substituto" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTeamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.name}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="swap-reason">Motivo (opcional)</Label>
                  <Input
                    id="swap-reason"
                    value={swapReason}
                    onChange={(event) => setSwapReason(event.target.value)}
                    placeholder="Ex: troca entre colegas"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSwapDialog(false);
                      resetSwapForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveSwap} className="flex-1">
                    Confirmar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reorder Dialog */}
          {showReorderMode && (
            <Dialog open={showReorderMode} onOpenChange={setShowReorderMode}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Organizar Ordem de Rotação</DialogTitle>
                    <DialogDescription>
                      Arraste para reordenar a sequência de plantão
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Label>Editar rotacao de</Label>
                    <RadioGroup value={rotationTarget} onValueChange={handleRotationTargetChange}>
                      {rotationTargets.map((option) => (
                        <label key={option.value} className="flex items-center gap-3 text-sm">
                          <RadioGroupItem value={option.value} />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      Voce esta editando a rotacao da escala:{" "}
                      <span className="font-medium text-foreground">
                        {getRotationTargetLabel(rotationTarget)}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {reorderList.map((memberId, index) => {
                      const member = activeTeamMembers.find((item) => item.id === memberId);
                      const label = member?.name ?? "Membro";
                      return (
                      <div
                        key={memberId}
                        draggable
                        onDragStart={handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-3 bg-secondary rounded-lg border border-transparent ${
                          dragIndex === index ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground cursor-grab select-none">::</span>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRestoreDefaultOrder}
                      className="w-full"
                    >
                      Restaurar ordem padrao
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowReorderMode(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveReorder} className="flex-1">
                        Salvar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Time Off Section */}
            <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Férias/Licenças</h3>
                <Dialog open={showAddTimeOff} onOpenChange={setShowAddTimeOff}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Plus size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Férias/Licença</DialogTitle>
                      <DialogDescription>
                        Configure período de ausência
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="person">Pessoa</Label>
                        <Select value={timeOffPerson} onValueChange={setTimeOffPerson}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a pessoa" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeTeamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.name}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="start-date">Data Inicial</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={timeOffStartDate}
                          onChange={(e) => setTimeOffStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={timeOffType} onValueChange={(v) => setTimeOffType(v as "vacation" | "license")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vacation">Férias</SelectItem>
                            <SelectItem value="license">Licença</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="days">Quantidade de Dias</Label>
                        <Input
                          id="days"
                          type="number"
                          min="1"
                          value={timeOffDays}
                          onChange={(e) => setTimeOffDays(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="return-date">Retorno</Label>
                        <Input
                          id="return-date"
                          type="date"
                          value={timeOffReturnDateInput}
                          readOnly
                        />
                        {timeOffReturnDateLabel && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Retorna em: {timeOffReturnDateLabel}
                          </p>
                        )}
                      </div>
                      <Button onClick={handleAddTimeOff} className="w-full">
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Time Off List */}
              {timeOffs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma férias/licença registrada</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {timeOffs.map((timeOff) => {
                    const typeLabel = timeOff.type === "vacation" ? "Férias" : "Licença";
                    const startLabel = formatDateLabel(timeOff.startDate);
                    const returnLabel = getReturnDateLabel(timeOff.startDate, timeOff.daysCount);

                    return (
                      <div
                        key={timeOff.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{timeOff.personName}</div>
                          <div className="text-xs text-muted-foreground">
                            {typeLabel}: {startLabel} ({timeOff.daysCount} dias)
                            {returnLabel ? ` - Retorno: ${returnLabel}` : ""}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTimeOff(timeOff.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shift Swaps Section */}
            <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Trocas de Plantões</h3>
                <Button size="sm" variant="outline" className="gap-2" onClick={openSwapDialog}>
                  <Plus size={16} />
                </Button>
              </div>

              {shiftSwaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma troca registrada</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sortedShiftSwaps.map((swap) => {
                    const parsedDate = parseDateInput(swap.date);
                    const swapDateLabel = parsedDate ? formatDateDisplay(parsedDate) : swap.date;

                    return (
                      <div
                        key={swap.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => openSwapEditDialog(swap.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openSwapEditDialog(swap.id);
                          }
                        }}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {swapDateLabel}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {swap.originalPerson} {"->"} {swap.substitutePerson}
                          </div>
                          {swap.reason && (
                            <div className="text-xs text-muted-foreground">{swap.reason}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveSwap(swap.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
