import { expect, test } from "@playwright/test";
import { recordLearningAttempt } from "../../src/domain/learningEvidence";
import { createLearningEvidenceStore, learningEvidenceKey, normalizeLearningEvidence } from "../../src/persistence/learningEvidence";

test("learning evidence records the latest full attempt without changing other skills", () => {
  const initial = Object.freeze({ other: Object.freeze({ attempts: 2, correct: 3, total: 3 }) });
  const first = recordLearningAttempt(initial, "hearts-pass", [{ clean: true }, { clean: false }, { clean: false }]);
  expect(first).toEqual({ ...initial, "hearts-pass": { attempts: 1, correct: 1, total: 3 } });
  const retry = recordLearningAttempt(first, "hearts-pass", [{ clean: true }, { clean: true }, { clean: true }]);
  expect(retry["hearts-pass"]).toEqual({ attempts: 2, correct: 3, total: 3 });
  expect(first["hearts-pass"].correct).toBe(1);
  expect(retry.other).toBe(initial.other);
  expect(recordLearningAttempt(first, "hearts-pass", [])).toBe(first);
  expect(recordLearningAttempt(first, "", [{ clean: true }])).toBe(first);
});

test("evidence storage validates counts, discards malformed entries and rejects unknown versions", () => {
  const valid = { attempts: 1, correct: 2, total: 3 };
  for (const bad of [null, [], {}, { version: 2, skills: {} }, { version: 1, skills: [] }]) {
    expect(normalizeLearningEvidence(bad)).toBeNull();
  }
  for (const bad of [null, "bad", 5, {}, { ...valid, attempts: 0 }, { ...valid, correct: 4 },
    { ...valid, correct: -1 }, { ...valid, total: 0 }, { ...valid, total: 1.5 }]) {
    expect(normalizeLearningEvidence({ version: 1, skills: { good: valid, bad } })).toEqual({ version: 1, skills: { good: valid } });
  }
  expect(normalizeLearningEvidence(JSON.parse('{"version":1,"skills":{"__proto__":{"attempts":1,"correct":1,"total":1}}}'))?.skills).toEqual({});
});

test("evidence round trips independently of course completion and tolerates unavailable storage", () => {
  const data = new Map<string, string>([["barbu.courseProgress.v1", '{"hearts-object":true}']]);
  const store = createLearningEvidenceStore(() => ({ getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  expect(store.load()).toBeNull();
  const saved = { version: 1 as const, skills: recordLearningAttempt({}, "hearts-object", [{ clean: true }]) };
  store.write(saved);
  expect(store.load()).toEqual(saved);
  store.write(null);
  expect(data.get("barbu.courseProgress.v1")).toBe('{"hearts-object":true}');
  data.set(learningEvidenceKey, "invalid json");
  expect(store.load()).toBeNull();
  expect(createLearningEvidenceStore(() => undefined).load()).toBeNull();
  const blocked = createLearningEvidenceStore(() => { throw Error("storage blocked"); });
  expect(blocked.load()).toBeNull();
  expect(() => blocked.write(saved)).toThrow("storage blocked");
});
