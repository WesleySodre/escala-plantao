import React, { createContext, useContext, useState, useEffect } from "react";
import { loadAppState } from "@/lib/stateApi";
import { adminLogout, getAdminJwt, isAdmin } from "@/auth/adminAuth";

export interface TimeOff {
  id: string;
  personName: string;
  startDate: string; // YYYY-MM-DD
  type: "vacation" | "license";
  daysCount: number;
}

export interface TeamMember {
  id: string;
  name: string;
  joinDate: string; // YYYY-MM-DD
  removeDate?: string; // YYYY-MM-DD (opcional, para exclusão com data de início)
  workDays: number[]; // 1-5 para seg-sex (por padrão todos os dias)
  canDoFriday: boolean;
}

export type AutoFridayCompensationMode = "previous" | "next" | "nearest";

export interface AutoFridaySwapConfig {
  enabled: boolean;
  queueMemberIds: string[];
  queuePointer: number;
  compensationMode: AutoFridayCompensationMode;
  sameMonthOnly?: boolean;
}

export interface ShiftSwap {
  id: string;
  date: string; // YYYY-MM-DD
  originalPerson: string;
  substitutePerson: string;
  reason?: string;
}

export interface Scale {
  id: string;
  name: string;
  weekdays: number[]; // 1-5 (seg-sex)
  rotationMemberIds: string[];
  isActive: boolean;
  createdAt: string;
  effectiveFrom?: string; // YYYY-MM-DD (quando a escala passa a valer)
  inactiveFrom?: string; // YYYY-MM-DD (quando a escala deixa de valer)
  anchorDate?: string;
  anchorMemberId?: string;
  autoFridaySwap?: AutoFridaySwapConfig;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface HistoricalShift {
  id: string;
  date: string; // YYYY-MM-DD
  person: string;
}

interface AppState {
  teamMembers: TeamMember[];
  timeOffs: TimeOff[];
  shiftSwaps: ShiftSwap[];
  scales: Scale[];
  holidays: Holiday[];
}

interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

const areStatesEqual = (a: AppState, b: AppState) => JSON.stringify(a) === JSON.stringify(b);

export const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: "1", date: "2026-01-01", name: "Ano Novo" },
  { id: "2", date: "2026-01-02", name: "Recesso" },
  { id: "3", date: "2026-01-03", name: "Recesso" },
  { id: "4", date: "2026-01-04", name: "Recesso" },
  { id: "5", date: "2026-01-05", name: "Recesso" },
  { id: "6", date: "2026-01-06", name: "Recesso" },
  { id: "7", date: "2026-02-16", name: "Carnaval (Suspensão)" },
  { id: "8", date: "2026-02-17", name: "Carnaval (Feriado)" },
  { id: "9", date: "2026-02-18", name: "Cinzas (Expediente após 13h)" },
  { id: "10", date: "2026-04-02", name: "Endoenças (Suspensão)" },
  { id: "11", date: "2026-04-03", name: "Sexta-feira Santa" },
  { id: "12", date: "2026-04-20", name: "Suspensão de expediente" },
  { id: "13", date: "2026-04-21", name: "Tiradentes" },
  { id: "14", date: "2026-05-01", name: "Dia do Trabalho" },
  { id: "15", date: "2026-05-19", name: "Aniversário de Hortolândia" },
  { id: "16", date: "2026-06-04", name: "Corpus Christi" },
  { id: "17", date: "2026-06-05", name: "Suspensão de expediente" },
  { id: "18", date: "2026-07-09", name: "Data Magna de SP" },
  { id: "19", date: "2026-07-10", name: "Suspensão de expediente" },
  { id: "20", date: "2026-09-07", name: "Independência do Brasil" },
  { id: "21", date: "2026-10-12", name: "Nsa. Sra. Aparecida" },
  { id: "22", date: "2026-10-26", name: "Dia do Servidor Público" },
  { id: "23", date: "2026-11-02", name: "Finados" },
  { id: "24", date: "2026-11-20", name: "Dia da Consciência Negra" },
  { id: "25", date: "2026-12-08", name: "Dia da Justiça" },
  { id: "26", date: "2026-12-20", name: "Recesso" },
  { id: "27", date: "2026-12-21", name: "Recesso" },
  { id: "28", date: "2026-12-22", name: "Recesso" },
  { id: "29", date: "2026-12-23", name: "Recesso" },
  { id: "30", date: "2026-12-24", name: "Recesso" },
  { id: "31", date: "2026-12-25", name: "Natal" },
  { id: "32", date: "2026-12-26", name: "Recesso" },
  { id: "33", date: "2026-12-27", name: "Recesso" },
  { id: "34", date: "2026-12-28", name: "Recesso" },
  { id: "35", date: "2026-12-29", name: "Recesso" },
  { id: "36", date: "2026-12-30", name: "Recesso" },
  { id: "37", date: "2026-12-31", name: "Recesso" },
];

const DEFAULT_ROTATION_NAMES = [
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

const DEFAULT_AUTO_FRIDAY_SWAP: AutoFridaySwapConfig = {
  enabled: false,
  queueMemberIds: [],
  queuePointer: 0,
  compensationMode: "next",
  sameMonthOnly: false,
};

export const DEFAULT_HISTORICAL_SHIFTS: HistoricalShift[] = [
  { id: "historical-2026-01-07", date: "2026-01-07", person: "Cláudia" },
  { id: "historical-2026-01-08", date: "2026-01-08", person: "Rosana" },
  { id: "historical-2026-01-09", date: "2026-01-09", person: "Daniel" },
  { id: "historical-2026-01-12", date: "2026-01-12", person: "José Cláudio" },
  { id: "historical-2026-01-13", date: "2026-01-13", person: "Kátia" },
  { id: "historical-2026-01-14", date: "2026-01-14", person: "Daniel" },
  { id: "historical-2026-01-15", date: "2026-01-15", person: "Leonardo" },
  { id: "historical-2026-01-16", date: "2026-01-16", person: "Leonardo" },
  { id: "historical-2026-01-19", date: "2026-01-19", person: "Dong" },
  { id: "historical-2026-01-20", date: "2026-01-20", person: "Benedito" },
  { id: "historical-2026-01-21", date: "2026-01-21", person: "Mauro" },
  { id: "historical-2026-01-22", date: "2026-01-22", person: "Cláudia" },
  { id: "historical-2026-01-23", date: "2026-01-23", person: "Dong" },
  { id: "historical-2026-01-26", date: "2026-01-26", person: "Rosana" },
  { id: "historical-2026-01-27", date: "2026-01-27", person: "José Cláudio" },
  { id: "historical-2026-01-28", date: "2026-01-28", person: "Kátia" },
  { id: "historical-2026-01-29", date: "2026-01-29", person: "Daniel" },
  { id: "historical-2026-01-30", date: "2026-01-30", person: "Wesley" },
  { id: "historical-2026-02-02", date: "2026-02-02", person: "Leonardo" },
  { id: "historical-2026-02-03", date: "2026-02-03", person: "Dong" },
  { id: "historical-2026-02-04", date: "2026-02-04", person: "Wesley" },
  { id: "historical-2026-02-05", date: "2026-02-05", person: "Lúcia" },
  { id: "historical-2026-02-06", date: "2026-02-06", person: "Benedito" },
  { id: "historical-2026-02-09", date: "2026-02-09", person: "Benedito" },
  { id: "historical-2026-02-10", date: "2026-02-10", person: "Mauro" },
  { id: "historical-2026-02-11", date: "2026-02-11", person: "Cláudia" },
  { id: "historical-2026-02-12", date: "2026-02-12", person: "Rosana" },
  { id: "historical-2026-02-13", date: "2026-02-13", person: "Mauro" },
  { id: "historical-2026-02-18", date: "2026-02-18", person: "José Cláudio" },
  { id: "historical-2026-02-19", date: "2026-02-19", person: "Kátia" },
  { id: "historical-2026-02-20", date: "2026-02-20", person: "Cláudia" },
  { id: "historical-2026-02-23", date: "2026-02-23", person: "Daniel" },
  { id: "historical-2026-02-24", date: "2026-02-24", person: "Leonardo" },
  { id: "historical-2026-02-25", date: "2026-02-25", person: "Wesley" },
  { id: "historical-2026-02-26", date: "2026-02-26", person: "Lúcia" },
  { id: "historical-2026-02-27", date: "2026-02-27", person: "Rosana" },
  { id: "historical-2026-03-02", date: "2026-03-02", person: "Luís Fernando" },
  { id: "historical-2026-03-03", date: "2026-03-03", person: "Mauro" },
  { id: "historical-2026-03-04", date: "2026-03-04", person: "Rosana" },
  { id: "historical-2026-03-05", date: "2026-03-05", person: "José Cláudio" },
  { id: "historical-2026-03-06", date: "2026-03-06", person: "Kátia" },
  { id: "historical-2026-03-09", date: "2026-03-09", person: "Daniel" },
  { id: "historical-2026-03-10", date: "2026-03-10", person: "Leonardo" },
  { id: "historical-2026-03-11", date: "2026-03-11", person: "Wesley" },
  { id: "historical-2026-03-12", date: "2026-03-12", person: "Lúcia" },
  { id: "historical-2026-03-13", date: "2026-03-13", person: "Mauro" },
  { id: "historical-2026-03-16", date: "2026-03-16", person: "Luís Fernando" },
  { id: "historical-2026-03-17", date: "2026-03-17", person: "Rosana" },
  { id: "historical-2026-03-18", date: "2026-03-18", person: "José Cláudio" },
];

interface ScheduleContextType {
  // Team Management
  teamMembers: TeamMember[];
  addTeamMember: (name: string) => void;
  removeTeamMember: (id: string, removeDate?: string) => void;
  reorderTeamMembers: (newOrder: string[]) => void; // Reordenar por IDs
  updateTeamMemberWorkDays: (id: string, workDays: number[]) => void;
  updateTeamMemberCanDoFriday: (id: string, canDoFriday: boolean) => void;

  // Time Off Management
  timeOffs: TimeOff[];
  addTimeOff: (personName: string, startDate: string, type: "vacation" | "license", daysCount: number) => void;
  removeTimeOff: (id: string) => void;
  getTimeOffForPerson: (personName: string, date: string) => TimeOff | undefined;
  isPersonOnTimeOff: (personName: string, date: string) => boolean;

  // Shift Swap Management
  shiftSwaps: ShiftSwap[];
  addShiftSwap: (
    date: string,
    originalPerson: string,
    substitutePerson: string,
    reason?: string
  ) => void;
  updateShiftSwap: (id: string, updates: Partial<ShiftSwap>) => void;
  removeShiftSwap: (id: string) => void;

  // Scales Management
  scales: Scale[];
  addScale: (scale: Scale) => void;
  updateScale: (id: string, updates: Partial<Scale>) => void;
  removeScale: (id: string) => void;
  toggleScaleActive: (id: string, isActive: boolean) => void;
  restoreDefaultScales: () => void;

  // Holiday Management
  holidays: Holiday[];
  addHoliday: (date: string, name: string) => void;
  removeHoliday: (id: string) => void;
  isHolidayDate: (date: string) => boolean;
  replaceHolidays: (holidays: Holiday[]) => void;

  // Historical Manual Shifts
  historicalShifts: HistoricalShift[];
  replaceHistoricalShifts: (historicalShifts: HistoricalShift[]) => void;

  // Data Management
  reloadFromSupabase: () => Promise<boolean>;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const normalizeName = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  };

  const buildRotationFromNames = (members: TeamMember[]) => {
    const normalizedMembers = members.map((member) => ({
      id: member.id,
      key: normalizeName(member.name),
    }));
    const usedIds = new Set<string>();
    const orderedIds: string[] = [];

    DEFAULT_ROTATION_NAMES.forEach((name) => {
      const key = normalizeName(name);
      const match = normalizedMembers.find((member) => member.key === key && !usedIds.has(member.id));
      if (!match) return;
      usedIds.add(match.id);
      orderedIds.push(match.id);
    });

    members.forEach((member) => {
      if (usedIds.has(member.id)) return;
      usedIds.add(member.id);
      orderedIds.push(member.id);
    });

    return orderedIds;
  };

  const findMemberIdByName = (members: TeamMember[], name: string) => {
    const key = normalizeName(name);
    const match = members.find((member) => normalizeName(member.name) === key);
    return match?.id;
  };

  const buildDefaultScales = (members: TeamMember[]): Scale[] => {
    const rotationMemberIds = buildRotationFromNames(members);
    const katiaId = findMemberIdByName(members, "Katia");
    const claudiaId = findMemberIdByName(members, "Cláudia");

    return [
      {
        id: "scale-1",
        name: "Seg-Qui",
        weekdays: [1, 2, 3, 4],
        rotationMemberIds,
        isActive: true,
        createdAt: "2026-02-19",
        anchorDate: "2026-02-19",
        anchorMemberId: katiaId,
        autoFridaySwap: { ...DEFAULT_AUTO_FRIDAY_SWAP },
      },
      {
        id: "scale-2",
        name: "Sexta",
        weekdays: [5],
        rotationMemberIds,
        isActive: true,
        createdAt: "2026-02-20",
        anchorDate: "2026-02-20",
        anchorMemberId: claudiaId,
        autoFridaySwap: { ...DEFAULT_AUTO_FRIDAY_SWAP },
      },
    ];
  };

  const normalizeAutoFridaySwapConfig = (
    config: AutoFridaySwapConfig | undefined,
    memberIds: string[]
  ): AutoFridaySwapConfig => {
    const base = { ...DEFAULT_AUTO_FRIDAY_SWAP, ...(config ?? {}) };
    const queue = Array.isArray(base.queueMemberIds)
      ? base.queueMemberIds.filter(
          (id, index, list) => memberIds.includes(id) && list.indexOf(id) === index
        )
      : [];
    const pointer = Number.isFinite(base.queuePointer) ? base.queuePointer : 0;
    const normalizedPointer =
      queue.length > 0 ? ((pointer % queue.length) + queue.length) % queue.length : 0;
    const compensationMode =
      base.compensationMode === "previous" ||
      base.compensationMode === "next" ||
      base.compensationMode === "nearest"
        ? base.compensationMode
        : "next";
    return {
      enabled: Boolean(base.enabled),
      queueMemberIds: queue,
      queuePointer: normalizedPointer,
      compensationMode,
      sameMonthOnly: Boolean(base.sameMonthOnly),
    };
  };

  const normalizeScales = (nextScales: Scale[], members: TeamMember[]) => {
    const memberIds = members.map((member) => member.id);
    return nextScales.map((scale) => ({
      ...scale,
      autoFridaySwap: normalizeAutoFridaySwapConfig(scale.autoFridaySwap, memberIds),
    }));
  };

  const syncScaleMembers = (members: TeamMember[], existingScales: Scale[]) => {
    const memberIds = members.map((member) => member.id);
    return existingScales.map((scale) => {
      const filtered = scale.rotationMemberIds.filter((id) => memberIds.includes(id));
      const autoFridaySwap = normalizeAutoFridaySwapConfig(scale.autoFridaySwap, memberIds);
      return {
        ...scale,
        rotationMemberIds: filtered,
        autoFridaySwap,
      };
    });
  };

  const initialTeamMembers: TeamMember[] = [
    {
      id: "1",
      name: "Benedito",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "2",
      name: "Mauro",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "3",
      name: "Cláudia",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "4",
      name: "Rosana",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "5",
      name: "José Claudio",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "6",
      name: "Katia",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "7",
      name: "Daniel",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "8",
      name: "Leonardo",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "9",
      name: "Wesley",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "10",
      name: "Lúcia",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
    {
      id: "11",
      name: "Luis",
      joinDate: "2020-01-01",
      workDays: [1, 2, 3, 4, 5],
      canDoFriday: true,
    },
  ];

  const initialState: AppState = {
    teamMembers: initialTeamMembers,
    timeOffs: [],
    shiftSwaps: [],
    scales: buildDefaultScales(initialTeamMembers),
    holidays: DEFAULT_HOLIDAYS,
  };

  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: initialState,
    future: [],
  }));
  const [historicalShifts, setHistoricalShifts] = useState<HistoricalShift[]>(() => {
    if (typeof window === "undefined") return DEFAULT_HISTORICAL_SHIFTS;
    const savedHistoricalShifts = window.localStorage.getItem("historicalShifts");
    if (!savedHistoricalShifts) return DEFAULT_HISTORICAL_SHIFTS;

    try {
      return normalizeHistoricalShifts(JSON.parse(savedHistoricalShifts) as HistoricalShift[]);
    } catch (e) {
      console.error("Failed to load historical shifts", e);
      return DEFAULT_HISTORICAL_SHIFTS;
    }
  });

  const { teamMembers, timeOffs, shiftSwaps, scales, holidays } = history.present;

  const normalizeTeam = (members: TeamMember[]) =>
    members.map((member) => ({
      ...member,
      workDays: Array.isArray(member.workDays) ? member.workDays : [1, 2, 3, 4, 5],
      canDoFriday: typeof member.canDoFriday === "boolean" ? member.canDoFriday : true,
    }));

  function normalizeHistoricalShifts(items: HistoricalShift[]) {
    const byDate = new Map<string, HistoricalShift>();

    items.forEach((item) => {
      if (!item || typeof item.date !== "string" || typeof item.person !== "string") {
        return;
      }

      const date = item.date.trim();
      const person = item.person.trim();
      if (!date || !person) return;

      byDate.set(date, {
        id: item.id || `historical-${date}`,
        date,
        person,
      });
    });

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  const applyStateFromPayload = (payload: {
    teamMembers?: TeamMember[];
    timeOffs?: TimeOff[];
    holidays?: Holiday[];
    shiftSwaps?: ShiftSwap[];
    scales?: Scale[];
    historicalShifts?: HistoricalShift[];
  }) => {
    if (Array.isArray(payload.historicalShifts)) {
      setHistoricalShifts(normalizeHistoricalShifts(payload.historicalShifts));
    }

    setHistory((prev) => {
      const base = prev.present;
      let nextTeamMembers = base.teamMembers;

      if (Array.isArray(payload.teamMembers)) {
        nextTeamMembers = normalizeTeam(payload.teamMembers);
      }

      const nextTimeOffs = Array.isArray(payload.timeOffs) ? payload.timeOffs : base.timeOffs;
      const nextShiftSwaps = Array.isArray(payload.shiftSwaps)
        ? payload.shiftSwaps
        : base.shiftSwaps;

      let nextScales = base.scales;
      if (Array.isArray(payload.scales)) {
        nextScales = normalizeScales(payload.scales, nextTeamMembers);
      } else if (payload.scales === undefined) {
        nextScales = buildDefaultScales(nextTeamMembers);
      }

      const nextHolidays = Array.isArray(payload.holidays) ? payload.holidays : base.holidays;
      const syncedScales = syncScaleMembers(nextTeamMembers, nextScales);

      const nextPresent: AppState = {
        teamMembers: nextTeamMembers,
        timeOffs: nextTimeOffs,
        shiftSwaps: nextShiftSwaps,
        scales: syncedScales,
        holidays: nextHolidays,
      };

      return {
        past: [],
        present: areStatesEqual(base, nextPresent) ? base : nextPresent,
        future: [],
      };
    });
  };

  const commit = (updater: (prev: AppState) => AppState) => {
    setHistory((prevHistory) => {
      const nextPresent = updater(prevHistory.present);
      if (nextPresent === prevHistory.present) return prevHistory;
      if (areStatesEqual(prevHistory.present, nextPresent)) return prevHistory;
      return {
        past: [...prevHistory.past, prevHistory.present],
        present: nextPresent,
        future: [],
      };
    });
  };

  const commitTeamMembers = (updater: (members: TeamMember[]) => TeamMember[]) => {
    commit((prev) => {
      const nextMembers = updater(prev.teamMembers);
      const nextScales = syncScaleMembers(nextMembers, prev.scales);
      return {
        ...prev,
        teamMembers: nextMembers,
        scales: nextScales,
      };
    });
  };

  const commitTimeOffs = (updater: (items: TimeOff[]) => TimeOff[]) => {
    commit((prev) => ({
      ...prev,
      timeOffs: updater(prev.timeOffs),
    }));
  };

  const commitShiftSwaps = (updater: (items: ShiftSwap[]) => ShiftSwap[]) => {
    commit((prev) => ({
      ...prev,
      shiftSwaps: updater(prev.shiftSwaps),
    }));
  };

  const commitScales = (updater: (items: Scale[]) => Scale[]) => {
    commit((prev) => ({
      ...prev,
      scales: updater(prev.scales),
    }));
  };

  const commitHolidays = (updater: (items: Holiday[]) => Holiday[]) => {
    commit((prev) => ({
      ...prev,
      holidays: updater(prev.holidays),
    }));
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  };

  const redo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  };

  const loadFromLocalStorage = () => {
    const savedTeam = localStorage.getItem("teamMembers");
    const savedTimeOffs = localStorage.getItem("timeOffs");
    const savedHolidays = localStorage.getItem("holidays");
    const savedShiftSwaps = localStorage.getItem("shiftSwaps");
    const savedScales = localStorage.getItem("scales");
    const savedHistoricalShifts = localStorage.getItem("historicalShifts");

    const payload: {
      teamMembers?: TeamMember[];
      timeOffs?: TimeOff[];
      holidays?: Holiday[];
      shiftSwaps?: ShiftSwap[];
      scales?: Scale[];
      historicalShifts?: HistoricalShift[];
    } = {};

    if (savedTeam) {
      try {
        payload.teamMembers = JSON.parse(savedTeam) as TeamMember[];
      } catch (e) {
        console.error("Failed to load team members", e);
      }
    }

    if (savedTimeOffs) {
      try {
        payload.timeOffs = JSON.parse(savedTimeOffs) as TimeOff[];
      } catch (e) {
        console.error("Failed to load time offs", e);
      }
    }

    if (savedShiftSwaps) {
      try {
        payload.shiftSwaps = JSON.parse(savedShiftSwaps) as ShiftSwap[];
      } catch (e) {
        console.error("Failed to load shift swaps", e);
      }
    }

    if (savedScales) {
      try {
        payload.scales = JSON.parse(savedScales) as Scale[];
      } catch (e) {
        console.error("Failed to load scales", e);
      }
    }

    if (savedHolidays) {
      try {
        payload.holidays = JSON.parse(savedHolidays) as Holiday[];
      } catch (e) {
        console.error("Failed to load holidays", e);
      }
    }

    if (savedHistoricalShifts) {
      try {
        payload.historicalShifts = JSON.parse(savedHistoricalShifts) as HistoricalShift[];
      } catch (e) {
        console.error("Failed to load historical shifts", e);
      }
    }

    applyStateFromPayload(payload);
  };

  const reloadFromSupabase = async () => {
    try {
      const dbState = await loadAppState();
      if (dbState && Object.keys(dbState).length > 0) {
        applyStateFromPayload(dbState);
        return true;
      }
    } catch (err) {
      console.error("Erro ao carregar estado do Supabase:", err);
    }
    return false;
  };

  // Load from Supabase (fallback to localStorage if empty)
  useEffect(() => {
    const init = async () => {
      const loaded = await reloadFromSupabase();
      if (!loaded) {
        loadFromLocalStorage();
      }
    };

    init();
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("teamMembers", JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem("timeOffs", JSON.stringify(timeOffs));
  }, [timeOffs]);

  useEffect(() => {
    localStorage.setItem("shiftSwaps", JSON.stringify(shiftSwaps));
  }, [shiftSwaps]);

  useEffect(() => {
    localStorage.setItem("scales", JSON.stringify(scales));
  }, [scales]);

  useEffect(() => {
    localStorage.setItem("holidays", JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    localStorage.setItem("historicalShifts", JSON.stringify(historicalShifts));
  }, [historicalShifts]);

  useEffect(() => {
    if (!isAdmin()) return;

    const token = getAdminJwt();
    if (!token) {
      adminLogout();
      alert("SessÃ£o expirada. Entre como admin novamente.");
      return;
    }

    const payload = {
      teamMembers,
      timeOffs,
      holidays,
      shiftSwaps,
      scales,
      historicalShifts,
    };

    const saveState = async () => {
      try {
        const res = await fetch("/.netlify/functions/save-state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: payload }),
        });

        if (res.status === 401) {
          adminLogout();
          alert("SessÃ£o expirada. Entre como admin novamente.");
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          console.error("Erro ao salvar estado no Supabase:", text);
        }
      } catch (err) {
        console.error("Erro ao salvar estado no Supabase:", err);
      }
    };

    saveState();
  }, [teamMembers, timeOffs, holidays, shiftSwaps, scales, historicalShifts]);

  const addTeamMember = (name: string) => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name,
      joinDate: new Date().toISOString().split("T")[0],
      workDays: [1, 2, 3, 4, 5], // Por padrão, todos os dias
      canDoFriday: true,
    };
    commitTeamMembers((members) => [...members, newMember]);
  };

  const removeTeamMember = (id: string, removeDate?: string) => {
    commitTeamMembers((members) => {
      if (removeDate) {
        // Exclusão com data de início: apenas adiciona removeDate
        return members.map((member) =>
          member.id === id ? { ...member, removeDate } : member
        );
      }
      // Exclusão completa
      return members.filter((member) => member.id !== id);
    });
  };

  const updateTeamMemberWorkDays = (id: string, workDays: number[]) => {
    commitTeamMembers((members) =>
      members.map((member) => (member.id === id ? { ...member, workDays } : member))
    );
  };

  const updateTeamMemberCanDoFriday = (id: string, canDoFriday: boolean) => {
    commitTeamMembers((members) =>
      members.map((member) =>
        member.id === id ? { ...member, canDoFriday } : member
      )
    );
  };

  const reorderTeamMembers = (newOrder: string[]) => {
    commitTeamMembers((members) => {
      const reorderedMembers = newOrder
        .map((id) => members.find((member) => member.id === id))
        .filter((member) => member !== undefined) as TeamMember[];
      const orderSet = new Set(newOrder);
      const remainingMembers = members.filter((member) => !orderSet.has(member.id));
      return [...reorderedMembers, ...remainingMembers];
    });
  };

  const addTimeOff = (
    personName: string,
    startDate: string,
    type: "vacation" | "license",
    daysCount: number
  ) => {
    const newTimeOff: TimeOff = {
      id: Date.now().toString(),
      personName,
      startDate,
      type,
      daysCount,
    };
    commitTimeOffs((items) => [...items, newTimeOff]);
  };

  const removeTimeOff = (id: string) => {
    commitTimeOffs((items) => items.filter((timeOff) => timeOff.id !== id));
  };

  const getTimeOffForPerson = (personName: string, date: string): TimeOff | undefined => {
    return timeOffs.find((timeOff) => {
      if (timeOff.personName !== personName) return false;

      const startDate = new Date(timeOff.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + timeOff.daysCount - 1);

      const checkDate = new Date(date);

      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const isPersonOnTimeOff = (personName: string, date: string): boolean => {
    return getTimeOffForPerson(personName, date) !== undefined;
  };

  const addShiftSwap = (
    date: string,
    originalPerson: string,
    substitutePerson: string,
    reason?: string
  ) => {
    const newSwap: ShiftSwap = {
      id: Date.now().toString(),
      date,
      originalPerson,
      substitutePerson,
      reason,
    };
    commitShiftSwaps((items) => [...items, newSwap]);
  };

  const updateShiftSwap = (id: string, updates: Partial<ShiftSwap>) => {
    commitShiftSwaps((items) =>
      items.map((swap) => (swap.id === id ? { ...swap, ...updates } : swap))
    );
  };

  const removeShiftSwap = (id: string) => {
    commitShiftSwaps((items) => items.filter((swap) => swap.id !== id));
  };

  const addScale = (scale: Scale) => {
    commitScales((items) => [...items, scale]);
  };

  const updateScale = (id: string, updates: Partial<Scale>) => {
    commitScales((items) =>
      items.map((scale) => (scale.id === id ? { ...scale, ...updates } : scale))
    );
  };

  const removeScale = (id: string) => {
    commitScales((items) => items.filter((scale) => scale.id !== id));
  };

  const toggleScaleActive = (id: string, isActive: boolean) => {
    commitScales((items) =>
      items.map((scale) => (scale.id === id ? { ...scale, isActive } : scale))
    );
  };

  const restoreDefaultScales = () => {
    commit((prev) => ({
      ...prev,
      scales: buildDefaultScales(prev.teamMembers),
    }));
  };

  const addHoliday = (date: string, name: string) => {
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      date,
      name,
    };
    commitHolidays((items) => [...items, newHoliday]);
  };

  const removeHoliday = (id: string) => {
    commitHolidays((items) => items.filter((holiday) => holiday.id !== id));
  };

  const isHolidayDate = (date: string): boolean => {
    return holidays.some((holiday) => holiday.date === date);
  };

  const replaceHolidays = (nextHolidays: Holiday[]) => {
    commitHolidays(() => nextHolidays);
  };

  const replaceHistoricalShifts = (nextHistoricalShifts: HistoricalShift[]) => {
    setHistoricalShifts(normalizeHistoricalShifts(nextHistoricalShifts));
  };

  return (
    <ScheduleContext.Provider
      value={{
        teamMembers,
        addTeamMember,
        removeTeamMember,
        reorderTeamMembers,
        updateTeamMemberWorkDays,
        updateTeamMemberCanDoFriday,
        timeOffs,
        addTimeOff,
        removeTimeOff,
        getTimeOffForPerson,
        isPersonOnTimeOff,
        shiftSwaps,
        addShiftSwap,
        updateShiftSwap,
        removeShiftSwap,
        scales,
        addScale,
        updateScale,
        removeScale,
        toggleScaleActive,
        restoreDefaultScales,
        holidays,
        addHoliday,
        removeHoliday,
        isHolidayDate,
        replaceHolidays,
        historicalShifts,
        replaceHistoricalShifts,
        reloadFromSupabase,
        undo,
        redo,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};
