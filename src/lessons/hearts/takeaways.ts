const takeaways: Record<string, string> = {
  object: "Follow suit when you can. Its highest card wins and collects the points, not the player who discarded them.",
  first: "Open with 2♣. Follow clubs, or discard without points if possible. Playing low is a tactic, not a rule.",
  queen: "Q♠ costs its trick winner 13 points. Check who will win before deciding whether the queen can leave safely.",
  avoid: "Hearts cost their trick winner 1 point each. Following suit is mandatory; playing low to avoid winning is a tactic.",
  pass: "Pass three with a plan: remove danger, keep low exits, or empty a suit. Recheck after receiving cards.",
  break: "Once hearts break, any suit may be led. You must still follow suit. An all-heart hand may lead hearts earlier.",
  moon: "Taking all 26 points scores zero and gives opponents 26 each. Taking one penalty yourself can stop an opponent's moon.",
  score: "Count cards, not tricks: each heart is 1 point and Q♠ is 13. A trick with neither scores zero."
};

export function heartsLessonTakeaway(action: string, clean: boolean) {
  const takeaway = takeaways[action] ?? takeaways.object;
  return clean ? takeaway : `Remember: ${takeaway}`;
}
