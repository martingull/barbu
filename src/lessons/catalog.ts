import type { GuidedLesson } from "../lessonTypes";
import { kingOfHeartsLesson } from "./kingOfHearts";
import { noHeartsLesson } from "./noHearts";
import { noLastTwoLesson } from "./noLastTwo";
import { noQueensLesson } from "./noQueens";
import { noTricksLesson } from "./noTricks";

export const guidedLessons: GuidedLesson[] = [
  noHeartsLesson,
  noQueensLesson,
  kingOfHeartsLesson,
  noLastTwoLesson,
  noTricksLesson
];
