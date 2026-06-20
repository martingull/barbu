import type { GuidedLesson } from "../lessonTypes";
import { dominoLesson } from "./domino";
import { heartsTrumpsLesson } from "./heartsTrumps";
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
  noTricksLesson,
  heartsTrumpsLesson,
  dominoLesson
];
