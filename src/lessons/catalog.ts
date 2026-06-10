import type { GuidedLesson } from "../lessonTypes";
import { kingOfHeartsLesson } from "./kingOfHearts";
import { noHeartsLesson } from "./noHearts";
import { noQueensLesson } from "./noQueens";

export const guidedLessons: GuidedLesson[] = [
  noHeartsLesson,
  noQueensLesson,
  kingOfHeartsLesson
];
