import {
  barbuLearnPathSteps,
  barbuPracticeGroups,
  gameTableDefinitions,
  heartsLearnPathSteps,
  heartsPracticeGroups,
  whistLearnPathSteps,
  whistPracticeGroups,
  type ActiveGameTable,
  type BarbuLearnPathStep,
  type BarbuPracticeGroup,
  type GameTableDefinition,
  type HeartsLearnPathStep,
  type HeartsPracticeGroup,
  type WhistLearnPathStep,
  type WhistPracticeGroup
} from "./tableFactory";

type GameUiRegistryEntry<LearnStep, PracticeGroup> = {
  table: GameTableDefinition;
  learnSteps: LearnStep[];
  practiceGroups: PracticeGroup[];
};

export const gameUiRegistry = {
  barbu: {
    table: gameTableDefinitions.barbu,
    learnSteps: barbuLearnPathSteps,
    practiceGroups: barbuPracticeGroups
  },
  hearts: {
    table: gameTableDefinitions.hearts,
    learnSteps: heartsLearnPathSteps,
    practiceGroups: heartsPracticeGroups
  },
  whist: {
    table: gameTableDefinitions.whist,
    learnSteps: whistLearnPathSteps,
    practiceGroups: whistPracticeGroups
  }
} satisfies {
  barbu: GameUiRegistryEntry<BarbuLearnPathStep, BarbuPracticeGroup>;
  hearts: GameUiRegistryEntry<HeartsLearnPathStep, HeartsPracticeGroup>;
  whist: GameUiRegistryEntry<WhistLearnPathStep, WhistPracticeGroup>;
};

export function gameUiFor(game: ActiveGameTable) {
  return gameUiRegistry[game];
}
