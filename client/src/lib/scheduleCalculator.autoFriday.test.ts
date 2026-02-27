import { describe, expect, it } from "vitest";
import { getScheduledPerson } from "./scheduleCalculator";
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

    const friday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [weekScale, fridayScale]
    );
    const thursday = getScheduledPerson(
      new Date(2026, 2, 5),
      teamMembers,
      [weekScale, fridayScale]
    );

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

    const friday = getScheduledPerson(
      new Date(2026, 2, 6),
      teamMembers,
      [weekScale, fridayScale]
    );
    const thursday = getScheduledPerson(
      new Date(2026, 2, 5),
      teamMembers,
      [weekScale, fridayScale]
    );

    expect(friday?.person).toBe("Bruno");
    expect(friday?.originalPerson).toBe("Ana");
    expect(thursday?.person).toBe("Ana");
    expect(thursday?.originalPerson).toBe("Bruno");
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
