import { expect, test } from "@playwright/test";
import { createBarbuPracticeLoader, isBarbuAttempt } from "../../src/features/barbu/barbuLearning";
import { guidedLessons } from "../../src/lessons/catalog";
import { fullHandContracts } from "../../src/domain/contractRegistry";
import type { DrillStep } from "../../src/lessons/drillDecision";

test("Barbu preserves authored courses, seeded four-pattern drills and standalone Domino", () => {
  let seed = 40;
  const loader = createBarbuPracticeLoader(() => undefined, () => seed++);
  for (const lesson of guidedLessons) {
    expect(loader.load(lesson.id, true)).toEqual({ seed: 0 });
    expect(seed).toBe(40);
  }
  for (const lesson of guidedLessons.filter(lesson => lesson.contract !== "Domino")) {
    const before = seed;
    const steps = loader.load(lesson.id) as DrillStep[];
    expect(steps).toHaveLength(4);
    expect(new Set(steps.map(step => step.scenarioId)).size).toBe(4);
    expect(steps.every(step => step.contract === lesson.contract)).toBe(true);
    expect(steps).toEqual(createBarbuPracticeLoader(() => undefined, () => before).load(lesson.contract));
  }
  expect(loader.load("domino")).toEqual({ seed: 46 });
  expect(() => loader.load("unknown")).toThrow("Unknown Barbu exercise");
  expect(seed).toBe(47);
});

test("mixed review retains seven contracts and pattern memory even when storage fails", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const loader = createBarbuPracticeLoader(() => storage, () => 20);
  const first = loader.load("mixed") as DrillStep[];
  expect(first.map(step => step.contract)).toEqual(fullHandContracts);
  expect(JSON.parse(data.get("barbu.drillPatternMemory.v1")!)).toHaveLength(6);
  const restored = createBarbuPracticeLoader(() => storage, () => 20);
  expect(restored.load("mixed")).toEqual(loader.load("mixed"));
  data.set("barbu.drillPatternMemory.v1", JSON.stringify([first[0].scenarioId]));
  const withRecent = createBarbuPracticeLoader(() => storage, () => 20).load("mixed") as DrillStep[];
  expect(withRecent[0].scenarioId).not.toBe(first[0].scenarioId);
  const blocked = createBarbuPracticeLoader(() => { throw Error("blocked"); }, () => 20);
  expect(blocked.load("mixed")).toEqual(first);
  expect(blocked.load("mixed")).toEqual(loader.load("mixed"));
});

test("Barbu history excludes empty and other-game attempts", () => {
  const result = { contract: "No Hearts", cardLabel: "2C", outcome: "good" as const, reason: "followed_suit" as const, clean: true };
  const attempt = { id: "example", completedAt: "2026-09-25", results: [result] };
  expect(isBarbuAttempt(attempt)).toBe(true);
  expect(isBarbuAttempt({ ...attempt, results: [] })).toBe(false);
  expect(isBarbuAttempt({ ...attempt, results: [result, { ...result, contract: "Hearts" }] })).toBe(false);
});
