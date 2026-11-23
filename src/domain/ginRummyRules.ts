export const ginScoringProfiles = {
  classic: { knockLimit: 10, ginBonus: 20, undercutBonus: 10, boxBonus: 20, gameBonus: 100 },
  american: { knockLimit: 10, ginBonus: 25, undercutBonus: 25, boxBonus: 25, gameBonus: 100 }
} as const;
export type GinScoringProfile = keyof typeof ginScoringProfiles;
export type GinSettings = { profile: GinScoringProfile };
export const defaultGinSettings: GinSettings = { profile: "classic" };

export function isGinSettings(value: unknown): value is GinSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const settings = value as GinSettings;
  return settings.profile === "classic" || settings.profile === "american";
}
export function ginRulesFor(settings: GinSettings = defaultGinSettings) {
  if (!isGinSettings(settings)) throw Error("Invalid Gin Rummy scoring settings.");
  return { ...ginScoringProfiles[settings.profile], target: 100 as const };
}
