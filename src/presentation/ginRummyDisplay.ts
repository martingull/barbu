import { ginRulesFor, type GinSettings } from "../domain/ginRummyRules";

export const ginProfileNames = { classic: "Classic 20/10", american: "American 25/25" } as const;
export const ginSettingsSummary = (settings: GinSettings) => `${ginProfileNames[settings.profile]}, first to ${ginRulesFor(settings).target}`;
export function ginScoringAgreement(settings: GinSettings) {
  const rules = ginRulesFor(settings);
  return `Gin bonus ${rules.ginBonus}; undercut bonus ${rules.undercutBonus}; box bonus ${rules.boxBonus} per hand won. First to ${rules.target} hand points. Add a 100-point game bonus, or 200 for a shutout. Winner deals next; a drawn hand keeps its dealer.`;
}
