import type { CompletedHandTrick, Suit } from "./lessonTypes";

export function whistTrumpSuitFromHandId(id: string): Suit | null {
  const suffix = id.split("-").at(-1);
  if (suffix === "null") return null;
  return suffix === "C" || suffix === "D" || suffix === "H" || suffix === "S" ? suffix : "S";
}


export function whistPartnershipTrickCounts(tricks: CompletedHandTrick[]) {
  return tricks.reduce(
    (totals, trick) => ({
      playerSide: totals.playerSide + (trick.winnerIndex === 0 || trick.winnerIndex === 2 ? 1 : 0),
      opponentSide: totals.opponentSide + (trick.winnerIndex === 1 || trick.winnerIndex === 3 ? 1 : 0)
    }),
    { playerSide: 0, opponentSide: 0 }
  );
}


export function whistTrickFeedback(trick: CompletedHandTrick, contract = "Whist") {
  const winnerIsPlayerSide = trick.winnerIndex === 0 || trick.winnerIndex === 2;
  const hasTag = (item: CompletedHandTrick, tag: NonNullable<CompletedHandTrick["tacticalTags"]>[number]) => (item.tacticalTags ?? []).includes(tag);
  const partnershipLabel = winnerIsPlayerSide ? "You + Barbu" : "Left + Right";

  if (hasTag(trick, "trump_won")) {
    return winnerIsPlayerSide
      ? `${trick.winner} won with trump for ${partnershipLabel}. Good cut: your side took control.`
      : `${trick.winner} won with trump for ${partnershipLabel}. Count that trump as gone.`;
  }
  if (hasTag(trick, "avoided_overtake")) {
    return `Barbu held the trick and you stayed under him. Good ${contract} play: do not fight your own partner.`;
  }
  if (hasTag(trick, "partner_supported")) {
    return trick.winner === "You"
      ? "Barbu led the suit and you carried it home. Good third-hand support."
      : "Barbu's lead held for your side. Good: the partnership kept control.";
  }
  if (hasTag(trick, "partner_held")) {
    return "Barbu held the trick for your partnership. Save strength and watch what suit he led.";
  }

  return winnerIsPlayerSide
    ? `${trick.winner} won the trick for ${partnershipLabel}. Build toward odd tricks above six.`
    : `${trick.winner} won the trick for ${partnershipLabel}. Regain lead or return Barbu's suit.`;
}

