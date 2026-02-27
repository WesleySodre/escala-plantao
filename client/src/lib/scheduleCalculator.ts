/**
 * Logica de calculo de escala de plantao
 *
 * Regras:
 * - Plantao apenas em dias uteis (segunda a sexta)
 * - Sem plantao em finais de semana e feriados
 * - Escalas configuraveis por dia da semana
 * - Ordem definida por escala
 *
 * Ancoras:
 * - Cada escala pode definir anchorDate e anchorMemberId
 */

import type { TeamMember, ShiftSwap, Scale } from "@/contexts/ScheduleContext";

export interface ScheduleInfo {
  person: string;
  originalPerson?: string;
  date: Date;
  dayOfWeek: string;
  scaleId?: string;
  scaleName?: string;
  isHoliday: boolean;
  swapReason?: string;
}

type Assignment = {
  person: TeamMember;
  original: TeamMember;
  date: Date;
  dayOfWeek: number;
  scale: Scale;
  isHoliday: boolean;
  swapReason?: string;
};

type AutoFridaySwapConfig = NonNullable<Scale["autoFridaySwap"]>;

const AUTO_FRIDAY_SWAP_REASON = "Troca automática de sexta";

// Feriados e suspensoes de expediente em 2026
export const HOLIDAYS_2026 = [
  // Formato: "YYYY-MM-DD"
  "2026-01-01", // Ano Novo
  "2026-01-02",
  "2026-01-03",
  "2026-01-04",
  "2026-01-05",
  "2026-01-06", // Recesso
  "2026-02-16", // Carnaval (Suspensao)
  "2026-02-17", // Carnaval (Feriado)
  "2026-02-18", // Cinzas (Expediente apos 13h - considerar como feriado)
  "2026-04-02", // Endoencas (Suspensao)
  "2026-04-03", // Sexta-feira Santa
  "2026-04-20", // Suspensao de expediente
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalho
  "2026-05-19", // Aniversario de Hortolandia
  "2026-06-04", // Corpus Christi
  "2026-06-05", // Suspensao de expediente
  "2026-07-09", // Data Magna de SP
  "2026-07-10", // Suspensao de expediente
  "2026-09-07", // Independencia do Brasil
  "2026-10-12", // Nsa. Sra. Aparecida
  "2026-10-26", // Dia do Servidor Publico (transferido)
  "2026-11-02", // Finados
  "2026-11-20", // Dia da Consciencia Negra
  "2026-12-08", // Dia da Justica
  "2026-12-20",
  "2026-12-21",
  "2026-12-22",
  "2026-12-23",
  "2026-12-24",
  "2026-12-25", // Natal
  "2026-12-26",
  "2026-12-27",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31", // Recesso
];

const SCHEDULE_CUTOFF_DATE = "2026-02-14";

/**
 * Converte uma data para string no formato YYYY-MM-DD (data local)
 */
function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayLabel(dayOfWeek: number): string {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][dayOfWeek] ?? "";
}

function dateFromString(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isBeforeCutoff(date: Date): boolean {
  const cutoff = dateFromString(SCHEDULE_CUTOFF_DATE);
  if (!cutoff) return false;
  return normalizeDate(date) < cutoff;
}

function getScheduleStartDate(): Date {
  return dateFromString(SCHEDULE_CUTOFF_DATE) ?? new Date(2026, 1, 14);
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Verifica se uma data e feriado
 */
export function isHoliday(date: Date, holidays?: string[]): boolean {
  const dateStr = dateToString(date);
  if (holidays) {
    return holidays.includes(dateStr);
  }
  return HOLIDAYS_2026.includes(dateStr);
}

/**
 * Verifica se uma data e dia util (segunda a sexta e nao feriado)
 */
export function isWorkingDay(date: Date, holidays?: string[]): boolean {
  const dayOfWeek = date.getDay();
  // 0 = domingo, 1 = segunda, ..., 6 = sabado
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  return isWeekday && !isHoliday(date, holidays);
}

/**
 * Verifica se um membro esta ativo nessa data
 */
function isMemberActive(member: TeamMember, date: Date): boolean {
  const targetDate = normalizeDate(date);

  const joinDate = dateFromString(member.joinDate);
  if (joinDate && targetDate < joinDate) {
    return false;
  }

  if (member.removeDate) {
    const removeDate = dateFromString(member.removeDate);
    if (removeDate && targetDate >= removeDate) {
      return false;
    }
  }

  return true;
}

/**
 * Verifica se um membro trabalha nesse dia da semana
 */
function memberWorksOnDay(member: TeamMember, dayOfWeek: number): boolean {
  // dayOfWeek: 1 = segunda, 2 = terca, ..., 5 = sexta
  const workDays = Array.isArray(member.workDays) ? member.workDays : [1, 2, 3, 4, 5];
  return workDays.includes(dayOfWeek);
}

function getOrderedRotationMembers(
  activeMembers: TeamMember[],
  rotationMemberIds: string[]
): TeamMember[] {
  const byId = new Map(activeMembers.map((member) => [member.id, member]));
  const ordered = rotationMemberIds
    .map((id) => byId.get(id))
    .filter(Boolean) as TeamMember[];

  const orderedIds = new Set(ordered.map((member) => member.id));
  const missing = activeMembers.filter((member) => !orderedIds.has(member.id));

  return [...ordered, ...missing];
}

/**
 * Retorna apenas membros ativos e que trabalham no dia informado
 */
function getEligibleMembers(members: TeamMember[], date: Date): TeamMember[] {
  const dayOfWeek = date.getDay();
  return members.filter((member) => memberWorksOnDay(member, dayOfWeek));
}

function findMemberByName(members: TeamMember[], name: string): TeamMember | undefined {
  const key = normalizeName(name);
  return members.find((member) => normalizeName(member.name) === key);
}

function getRotationOrderForDate(
  date: Date,
  teamMembers: TeamMember[],
  scale: Scale
): TeamMember[] {
  const activeMembers = teamMembers.filter((member) => isMemberActive(member, date));
  return getOrderedRotationMembers(activeMembers, scale.rotationMemberIds);
}

function findNextEligibleInOrder(
  rotationOrder: TeamMember[],
  startIndex: number,
  date: Date,
  isAvailable?: (member: TeamMember) => boolean
): { member: TeamMember; index: number } | null {
  const total = rotationOrder.length;
  if (total === 0) return null;
  const dayOfWeek = date.getDay();
  const normalizedStart = ((startIndex % total) + total) % total;

  for (let offset = 0; offset < total; offset += 1) {
    const idx = (normalizedStart + offset) % total;
    const member = rotationOrder[idx];
    if (!memberWorksOnDay(member, dayOfWeek)) continue;
    if (isAvailable && !isAvailable(member)) continue;
    return { member, index: idx };
  }

  return null;
}

function isScaleWorkingDay(date: Date, scale: Scale, holidays?: string[]): boolean {
  if (!isWorkingDay(date, holidays)) return false;
  return scale.weekdays.includes(date.getDay());
}

export function getActiveScaleForDate(date: Date, scales: Scale[]): Scale | null {
  const dayOfWeek = date.getDay();
  const match = scales.find(
    (scale) => scale.isActive && scale.weekdays.includes(dayOfWeek)
  );
  return match ?? null;
}

const DEFAULT_AUTO_FRIDAY_SWAP: AutoFridaySwapConfig = {
  enabled: false,
  queueMemberIds: [],
  queuePointer: 0,
  compensationMode: "next",
};

function normalizeAutoFridaySwapConfig(
  config: Scale["autoFridaySwap"] | undefined,
  memberIds: Set<string>
): AutoFridaySwapConfig {
  const base = { ...DEFAULT_AUTO_FRIDAY_SWAP, ...(config ?? {}) };
  const queueMemberIds = Array.isArray(base.queueMemberIds)
    ? base.queueMemberIds.filter(
        (id, index, list) => memberIds.has(id) && list.indexOf(id) === index
      )
    : [];
  const pointer = Number.isFinite(base.queuePointer) ? base.queuePointer : 0;
  const normalizedPointer =
    queueMemberIds.length > 0
      ? ((pointer % queueMemberIds.length) + queueMemberIds.length) %
        queueMemberIds.length
      : 0;
  const compensationMode =
    base.compensationMode === "previous" ||
    base.compensationMode === "next" ||
    base.compensationMode === "nearest"
      ? base.compensationMode
      : "next";
  return {
    enabled: Boolean(base.enabled),
    queueMemberIds,
    queuePointer: normalizedPointer,
    compensationMode,
  };
}

/**
 * Calcula o deslocamento de dias da escala entre uma ancora e a data alvo
 */
function countScaleDaysBetween(
  anchorDate: Date,
  targetDate: Date,
  scale: Scale,
  holidays?: string[]
): number {
  let daysCount = 0;
  let currentDate = normalizeDate(anchorDate);
  const normalizedTarget = normalizeDate(targetDate);

  if (normalizedTarget < currentDate) {
    while (currentDate > normalizedTarget) {
      currentDate.setDate(currentDate.getDate() - 1);
      if (isScaleWorkingDay(currentDate, scale, holidays)) {
        daysCount--;
      }
    }
  } else if (normalizedTarget > currentDate) {
    while (currentDate < normalizedTarget) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (isScaleWorkingDay(currentDate, scale, holidays)) {
        daysCount++;
      }
    }
  }

  return daysCount;
}

/**
 * Encontra o proximo membro disponivel (nao em ferias) para cobrir um plantao
 */
function findNextAvailablePerson(
  originalPerson: TeamMember,
  date: Date,
  isPersonOnTimeOff: (person: string, dateStr: string) => boolean,
  eligibleMembers: TeamMember[]
): TeamMember {
  const currentIndex = eligibleMembers.indexOf(originalPerson);
  if (currentIndex === -1) return originalPerson;

  const dateStr = dateToString(date);
  let nextIndex = (currentIndex + 1) % eligibleMembers.length;
  let attempts = 0;
  const maxAttempts = eligibleMembers.length;

  while (attempts < maxAttempts) {
    const nextMember = eligibleMembers[nextIndex];
    if (!isPersonOnTimeOff(nextMember.name, dateStr)) {
      return nextMember;
    }
    nextIndex = (nextIndex + 1) % eligibleMembers.length;
    attempts++;
  }

  return originalPerson;
}

function getAssignmentWithAdvancement(
  targetDate: Date,
  scale: Scale,
  teamMembers: TeamMember[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[]
): { person: TeamMember; original: TeamMember } | null {
  const anchorDate =
    (scale.anchorDate && dateFromString(scale.anchorDate)) ||
    (scale.createdAt && dateFromString(scale.createdAt)) ||
    targetDate;

  let pointerMemberId: string | null = null;
  const cursor = new Date(anchorDate);

  while (cursor <= targetDate) {
    if (!isScaleWorkingDay(cursor, scale, holidays)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const rotationOrder = getRotationOrderForDate(cursor, teamMembers, scale);
    if (rotationOrder.length === 0) {
      if (isSameDate(cursor, targetDate)) {
        return null;
      }
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    let startIndex = 0;
    if (pointerMemberId) {
      const pointerIndex = rotationOrder.findIndex((member) => member.id === pointerMemberId);
      startIndex = pointerIndex >= 0 ? (pointerIndex + 1) % rotationOrder.length : 0;
    } else if (isSameDate(cursor, anchorDate) && scale.anchorMemberId) {
      const anchorIndex = rotationOrder.findIndex(
        (member) => member.id === scale.anchorMemberId
      );
      startIndex = anchorIndex >= 0 ? anchorIndex : 0;
    }

    const originalInfo = findNextEligibleInOrder(rotationOrder, startIndex, cursor);
    if (!originalInfo) {
      if (isSameDate(cursor, targetDate)) {
        return null;
      }
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    let assignedInfo = originalInfo;
    if (isPersonOnTimeOff) {
      const dateStr = dateToString(cursor);
      if (isPersonOnTimeOff(originalInfo.member.name, dateStr)) {
        assignedInfo = findNextEligibleInOrder(
          rotationOrder,
          originalInfo.index + 1,
          cursor,
          (member) => !isPersonOnTimeOff(member.name, dateStr)
        ) ?? assignedInfo;
      }
    }

    pointerMemberId = assignedInfo.member.id;

    if (isSameDate(cursor, targetDate)) {
      return { person: assignedInfo.member, original: originalInfo.member };
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

/**
 * Obtem o plantao base (sem trocas manuais e sem troca automatica de sexta).
 */
function getBaseAssignment(
  date: Date,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[]
): Assignment | null {
  const targetDate = normalizeDate(date);
  const dayOfWeek = targetDate.getDay();
  const isHolidayDate = isHoliday(targetDate, holidays);

  if (isBeforeCutoff(targetDate)) {
    return null;
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return null;
  }

  if (isHolidayDate) {
    return null;
  }

  const activeScale = getActiveScaleForDate(targetDate, scales);
  if (!activeScale) {
    return null;
  }

  const rotationOrderForTarget = getRotationOrderForDate(targetDate, teamMembers, activeScale);
  const eligibleMembers = getEligibleMembers(rotationOrderForTarget, targetDate);
  if (eligibleMembers.length === 0) {
    return null;
  }

  const anchorDate =
    (activeScale.anchorDate && dateFromString(activeScale.anchorDate)) ||
    (activeScale.createdAt && dateFromString(activeScale.createdAt));

  let person: TeamMember;
  let originalPerson: TeamMember;

  if (anchorDate && targetDate < anchorDate) {
    const anchorMemberId = activeScale.anchorMemberId;
    let anchorIndex = 0;
    if (anchorMemberId) {
      const anchorMember = eligibleMembers.find((member) => member.id === anchorMemberId);
      if (anchorMember) {
        anchorIndex = eligibleMembers.indexOf(anchorMember);
      }
    }

    const daysCount = countScaleDaysBetween(anchorDate, targetDate, activeScale, holidays);
    const finalIndex = (anchorIndex + daysCount) % eligibleMembers.length;
    const normalizedIndex = finalIndex < 0 ? finalIndex + eligibleMembers.length : finalIndex;

    person = eligibleMembers[normalizedIndex];
    originalPerson = person;

    if (isPersonOnTimeOff) {
      const dateStr = dateToString(targetDate);
      if (isPersonOnTimeOff(person.name, dateStr)) {
        person = findNextAvailablePerson(
          originalPerson,
          targetDate,
          isPersonOnTimeOff,
          eligibleMembers
        );
      }
    }
  } else {
    const assignment = getAssignmentWithAdvancement(
      targetDate,
      activeScale,
      teamMembers,
      isPersonOnTimeOff,
      holidays
    );
    if (!assignment) {
      return null;
    }
    person = assignment.person;
    originalPerson = assignment.original;
  }

  return {
    person,
    original: originalPerson,
    date: new Date(targetDate),
    dayOfWeek,
    scale: activeScale,
    isHoliday: isHolidayDate,
  };
}

const MAX_COMPENSATION_LOOKUP_DAYS = 370;

function searchCompensationDate(
  startDate: Date,
  direction: -1 | 1,
  substituteId: string,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[]
): Date | null {
  const cursor = new Date(startDate);
  let safety = 0;

  while (safety < MAX_COMPENSATION_LOOKUP_DAYS) {
    cursor.setDate(cursor.getDate() + direction);
    const assignment = getBaseAssignment(cursor, teamMembers, scales, isPersonOnTimeOff, holidays);
    if (assignment && assignment.person.id === substituteId) {
      return new Date(cursor);
    }
    safety += 1;
  }

  return null;
}

function findCompensationDate(
  fridayDate: Date,
  substituteId: string,
  mode: AutoFridaySwapConfig["compensationMode"],
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[]
): Date | null {
  if (mode === "previous") {
    return searchCompensationDate(
      fridayDate,
      -1,
      substituteId,
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidays
    );
  }

  if (mode === "next") {
    return searchCompensationDate(
      fridayDate,
      1,
      substituteId,
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidays
    );
  }

  const previous = searchCompensationDate(
    fridayDate,
    -1,
    substituteId,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays
  );
  const next = searchCompensationDate(
    fridayDate,
    1,
    substituteId,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays
  );

  if (previous && next) {
    const prevDistance = Math.abs(
      normalizeDate(fridayDate).getTime() - normalizeDate(previous).getTime()
    );
    const nextDistance = Math.abs(
      normalizeDate(next).getTime() - normalizeDate(fridayDate).getTime()
    );
    return prevDistance <= nextDistance ? previous : next;
  }

  return previous ?? next ?? null;
}

function applyShiftSwapsToAssignments(
  assignments: Map<string, Assignment>,
  teamMembers: TeamMember[],
  shiftSwaps: ShiftSwap[]
) {
  shiftSwaps.forEach((swap) => {
    const parsedDate = dateFromString(swap.date);
    if (!parsedDate) return;
    const dateStr = dateToString(parsedDate);
    const current = assignments.get(dateStr);
    if (!current) return;

    const rotationOrder = getRotationOrderForDate(parsedDate, teamMembers, current.scale);
    const eligibleMembers = getEligibleMembers(rotationOrder, parsedDate);
    const substituteMember = findMemberByName(eligibleMembers, swap.substitutePerson);
    if (!substituteMember) return;

    const originalMember =
      findMemberByName(eligibleMembers, swap.originalPerson) ?? current.original;

    assignments.set(dateStr, {
      ...current,
      person: substituteMember,
      original: originalMember,
      swapReason: swap.reason,
    });
  });
}

function assignmentToScheduleInfo(assignment: Assignment): ScheduleInfo {
  return {
    person: assignment.person.name,
    originalPerson: assignment.original.name,
    date: new Date(assignment.date),
    dayOfWeek: getDayLabel(assignment.dayOfWeek),
    scaleId: assignment.scale.id,
    scaleName: assignment.scale.name,
    isHoliday: assignment.isHoliday,
    swapReason: assignment.swapReason,
  };
}

/**
 * Monta o mapa de escala considerando troca automática de sexta e trocas manuais.
 */
function buildScheduleMap(
  startDate: Date,
  endDate: Date,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[],
  shiftSwaps?: ShiftSwap[]
): Map<string, ScheduleInfo> {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);
  if (normalizedEnd < normalizedStart) {
    return new Map();
  }

  const memberById = new Map(teamMembers.map((member) => [member.id, member]));
  const memberIds = new Set(memberById.keys());
  const baseAssignments = new Map<string, Assignment>();

  for (
    let cursor = new Date(normalizedStart);
    cursor <= normalizedEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const base = getBaseAssignment(cursor, teamMembers, scales, isPersonOnTimeOff, holidays);
    if (base) {
      baseAssignments.set(dateToString(cursor), base);
    }
  }

  const effectiveAssignments = new Map<string, Assignment>();
  baseAssignments.forEach((value, key) => {
    effectiveAssignments.set(key, { ...value });
  });

  const swapState = new Map<
    string,
    { config: AutoFridaySwapConfig; pointer: number }
  >();
  scales.forEach((scale) => {
    const config = normalizeAutoFridaySwapConfig(scale.autoFridaySwap, memberIds);
    swapState.set(scale.id, { config, pointer: config.queuePointer });
  });

  for (
    let cursor = new Date(normalizedStart);
    cursor <= normalizedEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    if (cursor.getDay() !== 5) continue;

    const dateStr = dateToString(cursor);
    const base = baseAssignments.get(dateStr);
    if (!base) continue;

    const state = swapState.get(base.scale.id);
    if (!state || !state.config.enabled) continue;

    const queue = state.config.queueMemberIds;
    if (queue.length === 0) continue;

    const titular = base.person;
    if (titular.canDoFriday !== false) continue;

    const substituteId = queue[state.pointer];
    const substitute = memberById.get(substituteId);
    if (!substitute) continue;
    if (!isMemberActive(substitute, cursor)) continue;
    if (!memberWorksOnDay(substitute, 5)) continue;

    const compensationDate = findCompensationDate(
      cursor,
      substituteId,
      state.config.compensationMode,
      teamMembers,
      scales,
      isPersonOnTimeOff,
      holidays
    );
    if (!compensationDate) continue;

    state.pointer = (state.pointer + 1) % queue.length;

    effectiveAssignments.set(dateStr, {
      ...base,
      person: substitute,
      original: titular,
      swapReason: AUTO_FRIDAY_SWAP_REASON,
    });

    if (compensationDate >= normalizedStart && compensationDate <= normalizedEnd) {
      const compStr = dateToString(compensationDate);
      const compensationBase =
        baseAssignments.get(compStr) ??
        getBaseAssignment(compensationDate, teamMembers, scales, isPersonOnTimeOff, holidays);
      if (compensationBase) {
        effectiveAssignments.set(compStr, {
          ...compensationBase,
          person: titular,
          original: substitute,
          swapReason: AUTO_FRIDAY_SWAP_REASON,
        });
      }
    }
  }

  if (shiftSwaps && shiftSwaps.length > 0) {
    applyShiftSwapsToAssignments(effectiveAssignments, teamMembers, shiftSwaps);
  }

  const result = new Map<string, ScheduleInfo>();
  effectiveAssignments.forEach((assignment, key) => {
    result.set(key, assignmentToScheduleInfo(assignment));
  });

  return result;
}

/**
 * Obtem a pessoa escalada para uma data especifica
 */
export function getScheduledPerson(
  date: Date,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[],
  shiftSwaps?: ShiftSwap[]
): ScheduleInfo | null {
  const targetDate = normalizeDate(date);

  if (isBeforeCutoff(targetDate)) {
    return null;
  }

  const startDate = getScheduleStartDate();
  if (targetDate < startDate) {
    return null;
  }

  const scheduleMap = buildScheduleMap(
    startDate,
    targetDate,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays,
    shiftSwaps
  );

  return scheduleMap.get(dateToString(targetDate)) ?? null;
}

/**
 * Obtem a escala para um mes especifico
 */
export function getMonthSchedule(
  year: number,
  month: number,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[],
  shiftSwaps?: ShiftSwap[]
): ScheduleInfo[] {
  const schedule: ScheduleInfo[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = new Date(year, month, daysInMonth);
  const scheduleMap = buildScheduleMap(
    getScheduleStartDate(),
    monthEnd,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays,
    shiftSwaps
  );

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const scheduleInfo = scheduleMap.get(dateToString(date));
    if (scheduleInfo) schedule.push(scheduleInfo);
  }

  return schedule;
}

/**
 * Obtem os proximos N dias uteis a partir de uma data
 */
export function getNextWorkingDays(
  startDate: Date,
  count: number,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[],
  shiftSwaps?: ShiftSwap[]
): ScheduleInfo[] {
  const schedule: ScheduleInfo[] = [];
  const normalizedStart = normalizeDate(startDate);
  let currentDate = new Date(normalizedStart);
  currentDate.setDate(currentDate.getDate() + 1);

  let safety = 0;
  const safetyLimit = 370;
  const rangeEnd = new Date(normalizedStart);
  rangeEnd.setDate(rangeEnd.getDate() + safetyLimit);
  const scheduleMap = buildScheduleMap(
    getScheduleStartDate(),
    rangeEnd,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays,
    shiftSwaps
  );

  while (schedule.length < count && safety < safetyLimit) {
    const scheduleInfo = scheduleMap.get(dateToString(currentDate));
    if (scheduleInfo) schedule.push(scheduleInfo);
    currentDate.setDate(currentDate.getDate() + 1);
    safety++;
  }

  return schedule;
}

/**
 * Obtem a escala para uma pessoa especifica
 */
export function getScheduleForPerson(
  personName: string,
  year: number,
  month: number,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[],
  shiftSwaps?: ShiftSwap[]
): ScheduleInfo[] {
  const monthSchedule = getMonthSchedule(
    year,
    month,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays,
    shiftSwaps
  );
  return monthSchedule.filter((schedule) => schedule.person === personName);
}

/**
 * Conta quantos plantoes uma pessoa tem nos proximos N dias
 */
export function countUpcomingShifts(
  personName: string,
  days: number,
  teamMembers: TeamMember[],
  scales: Scale[],
  isPersonOnTimeOff?: (person: string, dateStr: string) => boolean,
  holidays?: string[],
  shiftSwaps?: ShiftSwap[]
): number {
  const upcomingSchedule = getNextWorkingDays(
    new Date(),
    days,
    teamMembers,
    scales,
    isPersonOnTimeOff,
    holidays,
    shiftSwaps
  );
  return upcomingSchedule.filter((schedule) => schedule.person === personName).length;
}

/**
 * Formata uma data para exibicao
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
