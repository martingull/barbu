import type { GuidedCardOutcome, PracticeReason } from "../lessonTypes";
import type { DrillResult } from "./drillDecision";

export type PlayBarbuAttempt = {
  id: string;
  completedAt: string;
  results: DrillResult[];
};

export type ContractResultSummary = {
  contract: string;
  clean: number;
  total: number;
  outcome: GuidedCardOutcome | "illegal";
};

export type ReviewInsight = {
  contract: string;
  message: string;
};

export type DrillLoopInsight = ReviewInsight & {
  heading: string;
  streakText: string;
};

export function summarizeContractResults(results: DrillResult[]): ContractResultSummary[] {
  const summaries = new Map<string, ContractResultSummary>();

  for (const result of results) {
    const summary = summaries.get(result.contract) ?? {
      contract: result.contract,
      clean: 0,
      total: 0,
      outcome: result.outcome
    };

    summary.total += 1;
    summary.clean += result.clean ? 1 : 0;
    summary.outcome = worstOutcome(summary.outcome, result.outcome);
    summaries.set(result.contract, summary);
  }

  return Array.from(summaries.values());
}


export function weakestContractFromResults(summaries: ContractResultSummary[]) {
  if (summaries.length === 0) {
    return "";
  }

  return [...summaries].sort((left, right) => {
    const leftRate = left.clean / left.total;
    const rightRate = right.clean / right.total;
    return leftRate - rightRate || outcomeSeverity(right.outcome) - outcomeSeverity(left.outcome);
  })[0].contract;
}


export function cleanAttemptCount(attempts: PlayBarbuAttempt[]) {
  return attempts.filter((attempt) => attempt.results.length > 0 && attempt.results.every((result) => result.clean)).length;
}


export function buildDrillLoopInsight(results: DrillResult[], attempts: PlayBarbuAttempt[]): DrillLoopInsight {
  try {
    const cleanCount = results.filter((result) => result.clean).length;
    const replayContract = weakestContractFromResults(summarizeContractResults(results));
    const reasonInsight = buildReasonInsight(results, {
      empty: "Finish a quick drill to unlock a replay target.",
      clean:
        "Good table. Repeat once more for rhythm, or replay the weakest contract to keep the habit sharp.",
      risky:
        "You won a clean trick. In avoidance contracts, only win when the trick is worth taking.",
      captured:
        "You captured a penalty. Before playing high, ask who wins if you stay low."
    });
    const cleanStreak = cleanAttemptCount(attempts);

    return {
      contract: replayContract || reasonInsight.contract,
      heading: results.length > 0 && cleanCount === results.length ? "Repeat for rhythm" : "Replay the weak spot",
      message: reasonInsight.message,
      streakText: cleanStreak
        ? `${cleanStreak} recent clean ${cleanStreak === 1 ? "table" : "tables"}`
        : "No clean streak yet"
    };
  } catch {
    return {
      contract: "",
      heading: "Repeat for rhythm",
      message: "Finish a quick drill to unlock a replay target.",
      streakText: "No clean streak yet"
    };
  }
}


export function worstOutcome(left: GuidedCardOutcome | "illegal", right: GuidedCardOutcome | "illegal") {
  return outcomeSeverity(right) > outcomeSeverity(left) ? right : left;
}


export function outcomeSeverity(outcome: GuidedCardOutcome | "illegal") {
  const severity: Record<GuidedCardOutcome | "illegal", number> = {
    good: 0,
    risky: 1,
    penalty: 2,
    illegal: 3
  };

  return severity[outcome];
}


export function buildReviewInsight(attempts: PlayBarbuAttempt[]): ReviewInsight {
  const recentResults = attempts.flatMap((attempt) => attempt.results);

  return buildReasonInsight(recentResults, {
    empty: "Play a practice table to give Barbu enough decisions to review.",
    clean: "You followed suit well. Keep repeating the table until reading the winner feels automatic.",
    risky: "You won a clean trick. That is legal, but keep checking whether the trick is actually dangerous.",
    captured: "You captured a penalty. Before playing high, ask who wins the trick if you stay low."
  });
}


export function buildReasonInsight(
  results: DrillResult[],
  copy: { empty: string; clean: string; risky: string; captured: string }
): ReviewInsight {
  if (results.length === 0) {
    return {
      contract: "",
      message: copy.empty
    };
  }

  const priority: PracticeReason[] = [
    "off_suit",
    "captured_penalty",
    "won_clean_trick",
    "void_discard",
    "avoided_penalty",
    "followed_suit"
  ];
  const reason = priority.find((candidate) => results.some((result) => result.reason === candidate));
  const result = reason ? results.find((item) => item.reason === reason) : undefined;
  const contract = result?.contract ?? "";

  if (reason === "off_suit") {
    return {
      contract,
      message: "Check the led suit before choosing. Off-suit cards are only allowed when you are void."
    };
  }

  if (reason === "captured_penalty") {
    return {
      contract,
      message:
        contract === "No Last Two"
          ? "You won a late trick. In No Last Two, the safe card is often the card that loses the trick."
          : copy.captured
    };
  }

  if (reason === "won_clean_trick") {
    return {
      contract,
      message: copy.risky
    };
  }

  if (reason === "void_discard") {
    return {
      contract,
      message: "You used a void turn to discard. Keep looking for chances to shed danger when someone else controls the trick."
    };
  }

  if (reason === "avoided_penalty") {
    return {
      contract,
      message:
        contract === "No Last Two"
          ? "Good avoidance. You lost the late trick while staying legal, which is the point of No Last Two."
          : "You avoided the penalty card. Keep locating the trick winner before choosing your card."
    };
  }

  return {
    contract,
    message: copy.clean
  };
}
