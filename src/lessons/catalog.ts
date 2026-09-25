import type { GuidedLesson } from "../domain/types";
import { dominoLesson } from "./barbu/domino";
import { heartsTrumpsLesson } from "./barbu/heartsTrumps";
import { kingOfHeartsLesson } from "./barbu/kingOfHearts";
import { noHeartsLesson } from "./barbu/noHearts";
import { noLastTwoLesson } from "./barbu/noLastTwo";
import { noQueensLesson } from "./barbu/noQueens";
import { noTricksLesson } from "./barbu/noTricks";

export const guidedLessons: GuidedLesson[] = [
  noHeartsLesson,
  noQueensLesson,
  kingOfHeartsLesson,
  noLastTwoLesson,
  noTricksLesson,
  heartsTrumpsLesson,
  dominoLesson
];
