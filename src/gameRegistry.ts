import type { GameTableDefinition, LearnPathStep, PracticeGroup } from "./tableFactory";

export interface GameDefinition<TAction extends string = string> {
  table: GameTableDefinition;
  learnSteps: LearnPathStep<TAction>[];
  practiceGroups: PracticeGroup<TAction>[];
  playTabConfig: {
    actionAriaLabel: string;
    groupAriaLabel: string;
    groupEyebrow: string;
    primaryLabel: string;
    supportingCopy?: string;
    footerNote?: string;
  };
  proTabConfig: {
    featuresAriaLabel: string;
    headingTitle: string;
    headingSummary: string;
  };
}

class GameRegistry {
  private games = new Map<string, GameDefinition<any>>();

  register<TAction extends string>(gameId: string, def: GameDefinition<TAction>) {
    this.games.set(gameId, def);
  }

  get<TAction extends string = string>(gameId: string): GameDefinition<TAction> | undefined {
    return this.games.get(gameId);
  }

  getAll(): GameDefinition<any>[] {
    return Array.from(this.games.values());
  }
}

export const registry = new GameRegistry();
