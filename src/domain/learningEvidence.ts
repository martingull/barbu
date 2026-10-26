export type SkillEvidence = { attempts: number; correct: number; total: number };
export type LearningEvidence = Record<string, SkillEvidence>;

// Completion records navigation progress; evidence describes the latest full attempt.
export function recordLearningAttempt(evidence: LearningEvidence, id: string, decisions: readonly { clean: boolean }[]): LearningEvidence {
  if (!id || !decisions.length) return evidence;
  return { ...evidence, [id]: { attempts: (evidence[id]?.attempts ?? 0) + 1,
    correct: decisions.filter(decision => decision.clean).length, total: decisions.length } };
}
