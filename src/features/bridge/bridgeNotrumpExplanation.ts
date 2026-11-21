import type { BridgeAuctionCall, Seat } from "../../domain/types";
import type { BridgeBiddingSystemId } from "../../domain/bridgeSystems";
import { bridgeBiddingSystems } from "../../domain/bridgeSystems";
import { parseBridgeBid } from "../../domain/bridgeBidding";
import { bridgeNotrumpContext } from "../../domain/bridgeNotrump";

export function explainNotrumpCall(call: string, calls: BridgeAuctionCall[], seat: Seat, system: BridgeBiddingSystemId): string | null {
  const context = bridgeNotrumpContext(calls, seat, system);
  if (!context) return null;
  const { opener, level, minimum, maximum, openerBids, responderBids } = context;
  const response = responderBids[0], reply = openerBids[1], continuation = responderBids[1];
  const bid = parseBridgeBid(call), profile = bridgeBiddingSystems[system];
  const invite = 25 - maximum, game = 25 - minimum;
  const transfer = profile.transfers && (response?.id === `${level}D` ? "hearts" : response?.id === `${level}H` ? "spades" : null);
  if (bid?.id === "4C") return "Gerber ace-asking is not implemented in this teaching profile. Partner has no agreed slam response to this call.";
  if (!opener && !response && bid) {
    if (bid.id === `${level}C`) return `Stayman: asks for a four-card major, not clubs. These constructive enquiries use ${level === 2 ? profile.staymanMinimum : game}+ HCP.`;
    if (profile.transfers && (bid.id === `${level}D` || bid.id === `${level}H`)) return `Jacoby transfer: asks opener to bid ${bid.strain === "D" ? "hearts" : "spades"}. Promises five or more in that major, not the suit called. ${level === 2 ? "No minimum HCP is needed." : "These 2NT responses use game-going strength."}`;
  }
  if (opener && !reply && response) {
    if (response.id === `${level}C` && bid) return bid.strain === "D" ? "Stayman reply: no four-card major. Diamonds are not promised."
      : bid.strain === "H" ? "Stayman reply: four or more hearts; may also hold four spades."
      : bid.strain === "S" ? "Stayman reply: four or more spades, without four hearts." : null;
    if (transfer && bid) return `Complete the Jacoby transfer to ${transfer}, even with only two cards there. ${bid.level > level ? "This superaccept shows four-card support and a maximum 1NT opening." : "Responder will pass, invite or bid game next."}`;
  }
  if (!opener && response && reply && !continuation) {
    if (transfer) {
      if (call === "Pass") return "Pass after the transfer acceptance: play in partner's major with a weak hand.";
      if (bid?.id === "2NT") return `${invite}-${game - 1} HCP with exactly five ${transfer}. Invites game; opener chooses the strain using their support.`;
      if (bid?.id === "3NT") return `${game}+ HCP and five ${transfer}. Opener may correct to the major game with three-card support.`;
      if (bid && bid.level >= 3) return `${bid.level === 3 ? "Invite" : "Choose game"} in ${transfer}. A normal jump after a two-level acceptance shows six or more; a superaccept has already established a fit.`;
    }
    if (response.id === `${level}C` && bid) {
      if (bid.id === "2NT") return `${invite}-${game - 1} HCP after Stayman, with no fit in opener's shown major. Invites notrump game.`;
      if (bid.id === "3NT") return `${game}+ HCP after Stayman, with no fit in opener's shown major. Opener may reveal the other major.`;
      if (bid.level === 4) return "Major game after Stayman: four-card support and game values, requiring ten tricks.";
      if (bid.level === 3 && bid.strain === reply.strain) return "Invitational raise of opener's Stayman major. Opener accepts with a maximum.";
      if (bid.level === 3 && (bid.strain === "H" || bid.strain === "S")) return "Game-forcing five-card major after Stayman. Opener chooses the major game with three-card support, otherwise 3NT.";
    }
  }
  if (opener && transfer && continuation && bid) return "After the transfer, use responder's stated strength and your major support to choose a partscore or game. The transfer itself did not promise points.";
  if (opener && response?.id === `${level}C` && reply?.strain === "H" && continuation?.strain === "NT" && bid?.strain === "S")
    return "Responder's notrump continuation denied a heart fit. Show the other four-card major: three spades invites; four chooses game.";
  return null;
}
