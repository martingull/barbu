import type { Seat, TableCard } from "../domain/types";

export type CourseStage = "concept" | "example" | "review";

type CoursePanel = {
  heading: string;
  body: string;
};

type CoursePoint = {
  marker: string;
  text: string;
};

type CourseSequenceStep = {
  label: string;
  text: string;
};

export type CoursePracticeTarget =
  | { kind: "guided-lesson"; game: "barbu"; lessonId: string }
  | { kind: "practice"; game: "hearts"; action: string }
  | { kind: "practice"; game: "whist"; action: string }
  | { kind: "practice"; game: "spades"; action: string }
  | { kind: "practice"; game: "bridge"; action: string }
  | { kind: "practice"; game: "gin-rummy"; action: string };

export type CourseContent = {
  id: string;
  game: "barbu" | "hearts" | "whist" | "spades" | "bridge" | "gin-rummy";
  pathStepId: string;
  practiceTarget: CoursePracticeTarget;
  contract: string;
  title: string;
  concept: CoursePanel & { points: CoursePoint[] };
  example: CoursePanel & {
    sequence: CourseSequenceStep[];
    ariaLabel: string;
    tableCards: TableCard[];
    pendingBySeat: Partial<Record<Seat, string>>;
  };
  review: CoursePanel & { points: CoursePoint[] };
};
