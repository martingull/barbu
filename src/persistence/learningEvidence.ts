import { createSaveStore, type SaveStorage } from "./saveStore";
import type { LearningEvidence } from "../domain/learningEvidence";

export const learningEvidenceKey = "barbu.learningEvidence.v1";
type SavedEvidence = { version: 1; skills: LearningEvidence };

export function normalizeLearningEvidence(value: unknown): SavedEvidence | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Partial<SavedEvidence>;
  if (saved.version !== 1 || !saved.skills || typeof saved.skills !== "object" || Array.isArray(saved.skills)) return null;
  const skills: LearningEvidence = {};
  for (const [id, skill] of Object.entries(saved.skills)) {
    if (!skill || !Number.isSafeInteger(skill.attempts) || skill.attempts < 1 ||
      !Number.isSafeInteger(skill.total) || skill.total < 1 || !Number.isSafeInteger(skill.correct) ||
      skill.correct < 0 || skill.correct > skill.total || ["__proto__", "constructor", "prototype"].includes(id)) continue;
    skills[id] = { attempts: skill.attempts, correct: skill.correct, total: skill.total };
  }
  return { version: 1, skills };
}

export const createLearningEvidenceStore = (storage: () => SaveStorage | undefined) =>
  createSaveStore(learningEvidenceKey, normalizeLearningEvidence, storage);
