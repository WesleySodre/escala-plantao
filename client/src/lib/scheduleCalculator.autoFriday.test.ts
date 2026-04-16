import { describe, expect, it } from "vitest";
import { getMonthSchedule, getScheduledPerson } from "./scheduleCalculator";
import type { Scale, TeamMember } from "../contexts/ScheduleContext";

const makeMember = (
  id: string,
  name: string,
  canDoFriday = true
): TeamMember => ({
  id,
  name,
  joinDate: "2020-01-01",
  workDays: [1, 2, 3, 4, 5],
  canDoFriday,
});

const makeScale = (overrides: Partial<Scale>): Scale => ({
  id: "scale",
  name: "Escala",
  weekdays: [1, 2, 3, 4, 5],
  rotationMemberIds: [],
  isActive: true,
  createdAt: "2026-03-01",
  anchorDate: "2026-03-01",
  anchorMemberId: undefined,
  autoFridaySwap: {
    enabled: false,
    queueMemberIds: [],
    queuePointer: 0,
    compensationMode: "next",
  },
  ...overrides,
});

describe("autoFridaySwap", () => {
  it("redistribui plantoes quando um membro sai apenas da rotacao da escala", () => {
    const ana = makeMember("a", "Ana");
    const bruno = makeMember("b", "Bruno");
    const carla = makeMember("c", "Carla");
    const teamMembers = [ana, bruno, carla];

    const scale = makeScale({
      id: "week",
      name: "Semana",
      weekdays: [1, 2, 3],
      rotationMemberIds: [ana.id, carla.id],
      createdAt: "2026-03-02",
      anchorDate: "2026-03-02",
      anchorMemberId: ana.id,
    });

    const schedule = getMonthSchedule(2026, 2, teamMembers, [scale]);
    const firstThreeDays = schedule
      .filter((day) => [2, 3, 4].includes(day.date.getDate()))
      .map((day) => day.person);

    expect(firstThreeDays).toEqual(["Ana", "Carla", "Ana"]);
    expect(firstThreeDays).not.toContain("Bruno");
  });

  it("compensa pelo último plantão do substituto (previous)", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const weekScale = makeScale({
      id: "week",
      name: "Seg-Qui",
      weekdays: [1, 2, 3, 4],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-02",
      anchorDate: "2026-03-02",
      anchorMemberId: ana.id,
    });

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
        queuePointer: 0,
        compensationMode: "previous",
      },
    });

    const schedule = getMonthSchedule(2026, 2, teamMembers, [
      weekScale,
      fridayScale,
    ]);
    const friday = schedule.find((day) => day.date.getDate() === 6);
    const thursday = schedule.find((day) => day.date.getDate() === 5);

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Ana");
    expect(thursday?.person).toBe("Ana");
    expect(thursday?.originalPerson).toBe("Bruno");
  });

  it("compensa pelo próximo plantão do substituto (next)", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const weekScale = makeScale({
      id: "week",
      name: "Seg-Qui",
      weekdays: [1, 2, 3, 4],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-02",
      anchorDate: "2026-03-02",
      anchorMemberId: ana.id,
    });

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
        queuePointer: 0,
        compensationMode: "next",
      },
    });

    const friday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [weekScale, fridayScale]
    );
    const tuesday = getScheduledPerson(
      new Date(2026, 2, 10),
      teamMembers,
      [weekScale, fridayScale]
    );

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Ana");
    expect(tuesday?.person).toBe("Ana");
    expect(tuesday?.originalPerson).toBe("Bruno");
  });

  it("usa o plantão mais próximo do substituto (nearest)", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const weekScale = makeScale({
      id: "week",
      name: "Seg-Qui",
      weekdays: [1, 2, 3, 4],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-02",
      anchorDate: "2026-03-02",
      anchorMemberId: ana.id,
    });

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
        queuePointer: 0,
        compensationMode: "nearest",
      },
    });

    const schedule = getMonthSchedule(2026, 2, teamMembers, [
      weekScale,
      fridayScale,
    ]);
    const friday = schedule.find((day) => day.date.getDate() === 6);
    const thursday = schedule.find((day) => day.date.getDate() === 5);

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Ana");
    expect(thursday?.person).toBe("Ana");
    expect(thursday?.originalPerson).toBe("Bruno");
  });

  it("nao compensa fora do mes quando nearest limita ao mesmo mes", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const carla = makeMember("c", "Carla", true);
    const dan = makeMember("d", "Dan", true);
    const ela = makeMember("e", "Ela", true);
    const teamMembers = [ana, bruno, carla, dan, ela];

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id, carla.id, dan.id, ela.id],
      createdAt: "2026-03-27",
      anchorDate: "2026-03-27",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
        queuePointer: 0,
        compensationMode: "nearest",
        sameMonthOnly: true,
      },
    });

    const friday = getScheduledPerson(
      new Date(2026, 2, 27),
      teamMembers,
      [fridayScale]
    );

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Ana");
    expect(friday?.swapReason).toBe("Troca automática de sexta");
  });

  it("nao retorna membro que nao faz sexta na rotacao normal", () => {
    const ana = makeMember("a", "Ana", false);
    const teamMembers = [ana];

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: false,
        queueMemberIds: [],
        queuePointer: 0,
        compensationMode: "next",
      },
    });

    const friday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [fridayScale]
    );

    expect(friday).toBeNull();
  });

  it("ignora compensacao em sexta para titular que nao pode fazer sexta", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const mondayScale = makeScale({
      id: "mon",
      name: "Segunda",
      weekdays: [1],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-09",
      anchorDate: "2026-03-09",
      anchorMemberId: ana.id,
    });

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
        queuePointer: 0,
        compensationMode: "next",
      },
    });

    const schedule = getMonthSchedule(2026, 2, teamMembers, [
      mondayScale,
      fridayScale,
    ]);
    const firstFriday = schedule.find((day) => day.date.getDate() === 6);
    const secondFriday = schedule.find((day) => day.date.getDate() === 13);
    const compensationMonday = schedule.find((day) => day.date.getDate() === 16);

    expect(firstFriday?.person).toBe("Bruno");
    expect(firstFriday?.originalPerson).toBe("Ana");
    expect(secondFriday?.person).toBe("Bruno");
    expect(secondFriday?.originalPerson).toBe("Bruno");
    expect(compensationMonday?.person).toBe("Ana");
    expect(compensationMonday?.originalPerson).toBe("Bruno");
  });

  it("nearest descarta sexta invalida antes de escolher a compensacao", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const mondayScale = makeScale({
      id: "mon",
      name: "Segunda",
      weekdays: [1],
      rotationMemberIds: [bruno.id, ana.id],
      createdAt: "2026-03-16",
      anchorDate: "2026-03-16",
      anchorMemberId: bruno.id,
    });

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [bruno.id, ana.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: bruno.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
        queuePointer: 0,
        compensationMode: "nearest",
      },
    });

    const schedule = getMonthSchedule(2026, 2, teamMembers, [
      mondayScale,
      fridayScale,
    ]);
    const replacementFriday = schedule.find((day) => day.date.getDate() === 13);
    const invalidPreviousFriday = schedule.find((day) => day.date.getDate() === 6);
    const compensationMonday = schedule.find((day) => day.date.getDate() === 16);

    expect(replacementFriday?.person).toBe("Bruno");
    expect(replacementFriday?.originalPerson).toBe("Ana");
    expect(invalidPreviousFriday?.person).toBe("Bruno");
    expect(invalidPreviousFriday?.originalPerson).toBe("Bruno");
    expect(compensationMonday?.person).toBe("Ana");
    expect(compensationMonday?.originalPerson).toBe("Bruno");
  });

  it("ignora troca manual que colocaria membro bloqueado na sexta", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [bruno.id, ana.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: bruno.id,
    });

    const friday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [fridayScale],
      undefined,
      undefined,
      [
        {
          id: "swap",
          date: "2026-03-06",
          originalPerson: "Bruno",
          substitutePerson: "Ana",
          reason: "Teste",
        },
      ]
    );

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Bruno");
  });

  it("permite troca manual valida corrigir sexta da rotacao normal", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", true);
    const teamMembers = [ana, bruno];

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
    });

    const friday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [fridayScale],
      undefined,
      undefined,
      [
        {
          id: "swap",
          date: "2026-03-06",
          originalPerson: "Ana",
          substitutePerson: "Bruno",
          reason: "Teste",
        },
      ]
    );

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Ana");
  });

  it("aplica troca para múltiplos membros que não fazem sexta", () => {
    const ana = makeMember("a", "Ana", false);
    const bruno = makeMember("b", "Bruno", false);
    const carla = makeMember("c", "Carla", true);
    const teamMembers = [ana, bruno, carla];

    const fridayScale = makeScale({
      id: "fri",
      name: "Sexta",
      weekdays: [5],
      rotationMemberIds: [ana.id, bruno.id, carla.id],
      createdAt: "2026-03-06",
      anchorDate: "2026-03-06",
      anchorMemberId: ana.id,
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [carla.id],
        queuePointer: 0,
        compensationMode: "next",
      },
    });

    const firstFriday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [fridayScale]
    );
    const secondFriday = getScheduledPerson(
      new Date(2026, 2, 13),
      teamMembers,
      [fridayScale]
    );

    expect(firstFriday?.person).toBe("Carla");
    expect(secondFriday?.person).toBe("Carla");
  });
});
