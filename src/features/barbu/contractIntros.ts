import type { FullHandContract } from "../../lessonTypes";

type RunContractIntro = { title: string; role: string; surface: string; target: string; reason: string; habit: string };

const runContractIntros: Partial<Record<FullHandContract, RunContractIntro>> = {
  "No Hearts": {
    title: "Hearts are cargo. Do not bring them home.",
    role: "Opening avoidance contract",
    surface: "Trick-taking hand",
    target: "Avoid winning heart tricks.",
    reason: "Barbu starts with the simplest penalty shape: dangerous cards inside ordinary tricks.",
    habit: "Locate the trick winner before worrying about the heart."
  },
  "No Queens": {
    title: "Queens punish the player who captures them.",
    role: "Penalty-card contract",
    surface: "Trick-taking hand",
    target: "Avoid queen tricks.",
    reason: "This contract raises the pressure because one high card can pull a queen into your score.",
    habit: "Duck under the current winner when a queen is loaded."
  },
  "King of Hearts": {
    title: "One card carries the contract.",
    role: "Single-danger contract",
    surface: "Trick-taking hand",
    target: "Avoid capturing KH.",
    reason: "Barbu now narrows the danger to one card, so tracking matters more than fear of the whole suit.",
    habit: "Find KH, then ask whether your card wins its trick."
  },
  "No Last Two": {
    title: "The end of the hand is dangerous.",
    role: "Timing contract",
    surface: "Trick-taking hand",
    target: "Avoid tricks 12 and 13.",
    reason: "Early tricks are setup. Barbu wants to see whether you can keep a late escape.",
    habit: "Count the hand before spending a low card."
  },
  "No Tricks": {
    title: "Every trick you win costs you.",
    role: "Pure avoidance contract",
    surface: "Trick-taking hand",
    target: "Avoid taking control.",
    reason: "This contract turns the whole hand into ducking practice.",
    habit: "Play below the current winner whenever the led suit allows it."
  },
  "Hearts Trumps": {
    title: "Hearts are trumps.",
    role: "Positive trick contract",
    surface: "Trump hand",
    target: "Win tricks with heart control.",
    reason: "Barbu flips the table: hearts now outrank the led suit and tricks are worth points.",
    habit: "Track whether a heart can cut the trick before you spend a high card."
  },
  Domino: {
    title: "Build the layout from sevens.",
    role: "Layout contract",
    surface: "Domino layout",
    target: "Go out before the table.",
    reason: "Barbu changes the surface: no tricks, just legal adjacent placements in each suit.",
    habit: "Open a suit with a seven, then extend the low or high end when you can."
  }
};

export function contractIntro(contract: FullHandContract): RunContractIntro {
  const intro = runContractIntros[contract];
  if (!intro) throw new Error(`No Barbu introduction for ${contract}`);
  return intro;
}
