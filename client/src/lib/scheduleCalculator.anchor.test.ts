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

describe("anchorDate/anchorMemberId", () => {
  it("usa o membro âncora na data definida e segue rotação", () => {
    const ana = makeMember("a", "Ana");
    const bruno = makeMember("b", "Bruno");
    const carla = makeMember("c", "Carla");
    const teamMembers = [ana, bruno, carla];

    const scale = makeScale({
      rotationMemberIds: [ana.id, bruno.id, carla.id],
      anchorDate: "2026-03-02",
      anchorMemberId: bruno.id,
      createdAt: "2026-03-01",
    });

    const monday = getScheduledPerson(new Date(2026, 2, 2), teamMembers, [scale]);
    const tuesday = getScheduledPerson(new Date(2026, 2, 3), teamMembers, [scale]);

    expect(monday?.person).toBe("Bruno");
    expect(monday?.originalPerson).toBe("Bruno");
    expect(tuesday?.person).toBe("Carla");
    expect(tuesday?.originalPerson).toBe("Carla");
  });

  it("quando a âncora cai em dia não útil, começa no próximo dia válido", () => {
    const ana = makeMember("a", "Ana");
    const bruno = makeMember("b", "Bruno");
    const teamMembers = [ana, bruno];

    const scale = makeScale({
      rotationMemberIds: [ana.id, bruno.id],
      anchorDate: "2026-03-07", // sábado
      anchorMemberId: bruno.id,
      createdAt: "2026-03-01",
    });

    const monday = getScheduledPerson(new Date(2026, 2, 9), teamMembers, [scale]);

    expect(monday?.person).toBe("Bruno");
    expect(monday?.originalPerson).toBe("Bruno");
  });

  it("âncora com troca automática de sexta mantém comportamento consistente", () => {
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
      autoFridaySwap: {
        enabled: true,
        queueMemberIds: [bruno.id],
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

    expect(firstFriday?.person).toBe("Bruno");
    expect(firstFriday?.originalPerson).toBe("Ana");
    expect(firstFriday?.swapReason).toBe("Troca automática de sexta");
    expect(secondFriday?.person).toBe("Ana");
    expect(secondFriday?.originalPerson).toBe("Bruno");
  });
});
